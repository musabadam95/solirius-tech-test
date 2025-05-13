export type Email =
    {
        name: string;
        email: string
    }
export type FailedRecords =
    {
        name: string;
        email: string
        error: string
    }
export type UploadStatus =
    {
        uploadID: string;
        totalRecords: number;
        processedRecords: number;
        failedRecords: number;
        details: FailedRecords[]
    }