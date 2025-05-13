import request from 'supertest';
import express from 'express';
import emailRouter from '../emailRoute';
import path from 'path';
import app from '../../app';

jest.mock('p-limit', () => {
    return jest.fn(() => {
        return async (fn: () => any) => await fn();
    });
});
beforeAll(() => {
    app.use(express.json());
    app.use('/email', emailRouter);
});
const mockfilePath = './mock/'
describe('Email Routes', () => {
    describe('POST /email/upload', () => {
        it('should return 400 if no file is uploaded', async () => {
            const res = await request(app).post('/upload');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'No file uploaded' });
        });

        it('should return 400 if file is not a CSV', async () => {
            const res = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('not a csv'), { filename: 'test.txt', contentType: 'text/plain' });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Invalid file type' });

        });


        it('should return 400 if CSV file does not contain correct headers', async () => {
            const res = await request(app)
                .post('/upload')
                .attach('file', path.resolve(__dirname, mockfilePath + './email-invalid-fields.csv'));
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Invalid CSV headers' });
        });

        it('should return 202 and success message for valid CSV upload', async () => {
            const expectedResBody = {
                totalRecords: 4,
                processedRecords: 4,
                failedRecords: 0,
                details: [],
                uploadID: expect.any(String),
            };
            const res = await request(app)
                .post('/upload')
                .attach('file', path.resolve(__dirname, mockfilePath + './email.csv'));
            expect(res.status).toBe(202);
            expect(res.body).toMatchObject(expectedResBody);
        });

        it('should return 202 and success message for valid CSV upload with failed emails', async () => {
            const expectedResBody = {
                totalRecords: 4,
                processedRecords: 1,
                failedRecords: 3,
                details: [
                    {
                        name: '',
                        email: 'test3@gmail.com',
                        error: 'Name field is empty'
                    },
                    {
                        name: 'Test 2',
                        email: 'test2gmail.com',
                        error: 'Invalid email address'
                    },
                    {
                        name: 'Test 3',
                        email: 'test3gmail.com',
                        error: 'Invalid email address'
                    }
                ],
                uploadID: expect.any(String),
            };
            const res = await request(app)
                .post('/upload')
                .attach('file', path.resolve(__dirname, mockfilePath + './email-invalid.csv'));
            expect(res.status).toBe(202);
            expect(res.body).toMatchObject(expectedResBody);
        });

        it('should return 202 and success message for valid CSV upload with no emails', async () => {
            const expectedResBody = {
                totalRecords: 0,
                processedRecords: 0,
                failedRecords: 0,
                details: [],
                uploadID: expect.any(String),
            };
            const res = await request(app)
                .post('/upload')
                .attach('file', path.resolve(__dirname, mockfilePath + './email-empty.csv'));
            expect(res.status).toBe(202);
            expect(res.body).toMatchObject(expectedResBody);
        });


        it('should return 202 and success message for large valid CSV upload ', async () => {
            const expectedResBody = {
                totalRecords: 100,
                processedRecords: 100,
                failedRecords: 0,
                details: [],
                uploadID: expect.any(String),
            };
            const res = await request(app)
                .post('/upload')
                .attach('file', path.resolve(__dirname, mockfilePath + './email-large.csv'));
            expect(res.status).toBe(202);
            expect(res.body).toMatchObject(expectedResBody);
        });
    });

    describe('GET /email/status/:uploadID', () => {
        it('should return upload status for a valid uploadID', async () => {
            const uploadRes = await request(app)
                .post('/upload')
                .attach('file', path.resolve(__dirname, mockfilePath + './email.csv'));
            const uploadID = uploadRes.body.uploadID;
            const res = await request(app).get(`/email/status/${uploadID}`);
            const expectedResBody = { "uploadID": uploadID, "progress": "100%" }
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject(expectedResBody);
        });

        it('should return error for a invalid uploadID', async () => {
            const res = await request(app).get(`/email/status/123`);
            expect(res.status).toBe(404);
        });
    });
});