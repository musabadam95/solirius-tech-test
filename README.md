
# Solirius Tech Test

This project is a Node.js/TypeScript application for uploading and validating email addresses from CSV files. It uses Express, Multer for file uploads, Redis for temporary storage, and Winston for logging.

## Features

- Upload CSV files containing email addresses.
- Validate emails asynchronously with concurrency control.
- Track upload and validation status using a unique upload ID.
- Retrieve upload progress and results.
- Rate limiting to prevent abuse.
- Logging to console and files.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm
- Docker (for Redis)

### Install Dependencies

```sh
npm install
```

### Start Redis (with Docker)

```sh
cd redis
docker-compose up
```

### Run the Application

```sh
npm run start
```

The server will start on port 8080.

### Run Tests

```sh
npm run test
```

## API Endpoints

### POST `/upload`

Upload a CSV file with `name` and `email` columns.

- **Form field:** `file` (CSV file)
- **Response:** UploadID and message.
- **Response:** Upload status and details.

### GET `/email/status/:uploadID`

Get the progress and results of a specific upload.

## Example CSV Format

```csv
name,email
John Doe,john@example.com
Jane Smith,jane@example.com
```