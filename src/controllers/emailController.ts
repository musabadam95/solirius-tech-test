import { Request, Response } from 'express';
import fs from 'fs';
import pLimit from 'p-limit';
const limit = pLimit(5);
import { Email, FailedRecords, UploadStatus } from '../types/email.types';
import { mockValidateEmail } from '../utils/validateEmail';
import { createClient } from "redis";
import { v7 } from 'uuid';
import Papa from 'papaparse'
import logger from '../utils/logger';
export const uploadCSV = async (req: Request, res: Response) => {
    const client = createClient();

    client.on("error", (err) => {
        // Handle Redis connection error and stop the process until a long term storage is implemented
        logger.error('Redis error =>', err);
        res.status(500).send({ message: 'Internal server error' });
        return
    });

    await client.connect()
    // Implement your CSV upload logic here
    if (!req.file) {
        logger.error('No file uploaded');
        res.status(400).send({ message: 'No file uploaded' });
        await client.quit()
        return
    }
    if (req.file.mimetype !== 'text/csv') {
        logger.error('Invalid file type');
        res.status(400).send({ message: 'Invalid file type' });
        await client.quit()
        return
    }
    try {
        const uploadID = v7();
        await client.set(uploadID, JSON.stringify({
            "totalRecords": 0,
            "processedRecords": 0,
            "failedRecords": 0,
            "details": []
        }))
        logger.info('File uploaded successfully', 'Upload ID:', uploadID);

        // Commented out the following line as it was causing issues with test and postman was showing both responses together.
        // To have the ability to to send an initial response, I would use res.write function at the start and end of the response

        // res.status(202)
        // res.status(202).write(JSON.stringify({ "message": 'File uploaded successfully' }));
        const filePath = req.file.path;
        const validationResults: Promise<void>[] = []
        const failedRecords: FailedRecords[] = []
        const processedRecords: string[] = []
        let totalRecords: number = 0
        let isCSVFieldsValid = false
        Papa.parse<Email>(fs.createReadStream(filePath), {
            header: true,
            skipEmptyLines: true,
            step: (row) => {
                if (!isCSVFieldsValid) {
                    const fields = row.meta.fields;
                    if (fields?.includes("name") && fields?.includes("email")) {
                        isCSVFieldsValid = true;
                        logger.info('CSV fields are valid');
                    } else {
                        throw new Error('Invalid CSV headers');
                    }
                }
                totalRecords++
                // Validate email address
                validationResults.push(
                    limit(async () => {
                        try {
                            if (row.data.name) {
                                const validatedResult = await mockValidateEmail(row.data.email)
                                if (validatedResult.isValid) {
                                    logger.info('Valid email:', row.data.email);
                                    processedRecords.push(row.data.email);
                                } else {
                                    logger.warn('Invalid email:', row.data.email);
                                    failedRecords.push({ name: row.data.name, email: row.data.email, error: validatedResult.error || 'Invalid email address' });
                                }
                            } else {
                                logger.warn('Name field is empty for email:', row.data.email);
                                failedRecords.push({ name: row.data.name, email: row.data.email, error: 'Name field is empty' });
                            }
                        } catch (error: unknown) {
                            if (error instanceof Error) {
                                logger.warn('Error validating email:', error);
                                failedRecords.push({ name: row.data.name, email: row.data.email, error: error.message || 'Error validating email' });
                            }
                        }
                        await client.set(uploadID, JSON.stringify({
                            "totalRecords": totalRecords,
                            "processedRecords": processedRecords.length,
                            "failedRecords": failedRecords.length,
                            "details": failedRecords
                        }))
                    })
                )
            },
            complete: async () => {
                await Promise.all(validationResults)
                logger.info(totalRecords + ' records processed');
                const statusMessage = {
                    "uploadID": uploadID,
                    "totalRecords": totalRecords,
                    "processedRecords": processedRecords.length,
                    "failedRecords": failedRecords.length,
                    "details": failedRecords
                } as UploadStatus
                await client.set(uploadID, JSON.stringify(statusMessage))
                await client.quit()
                return res.status(202).json(statusMessage);
            },
            error: (err: Error) => {
                if (err.message === 'Invalid CSV headers') {
                    logger.error('Invalid CSV headers');
                    res.status(400).send({ message: 'Invalid CSV headers' });
                    client.quit()

                } else {
                    logger.error('Error processing CSV file:', err);
                    res.status(500).send({ message: 'Error processing CSV file' });
                    client.quit()

                }
                return
            }
        });
    } catch (error) {
        await client.quit()
        if (error instanceof Error) {
            logger.error('Error:', error.message);
            res.status(500).send({ message: error.message });
        }
        else {
            logger.error('Error:', error);
            res.status(500).send({ message: 'Internal server error' });
        }
        return
    }

    return
}

export const getUploadStatus = async (req: Request, res: Response) => {
    const client = createClient();
    client.on("error", (err) => {
        logger.error('Redis error =>', err);
        res.status(500).send({ message: 'Internal server error' });
    });

    await client.connect()
    const uploadID = req.params.uploadID;
    const status = await client.get(uploadID)
    if (!status) {
        logger.error('Upload ID not found:', uploadID);
        res.status(404).send({ message: 'Upload ID not found' });
        await client.quit()
        return
    }
    logger.info('Upload ID found:', uploadID);
    const uploadStatus = JSON.parse(status) as UploadStatus;
    const percentageOfCompletion = uploadStatus.totalRecords ? ((uploadStatus.processedRecords + uploadStatus.failedRecords) / uploadStatus.totalRecords) * 100 : 0;
    const statusMessage = {
        "uploadID": uploadID,
        "progress": percentageOfCompletion + '%',
    }
    res.json(statusMessage);
    await client.quit()
    return
}