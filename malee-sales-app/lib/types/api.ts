/**
 * Response types for the FastAPI backend.
 */

export interface UploadResponse {
    filename?: string;
    job_id?: string;
    [key: string]: unknown;
}

export interface HealthResponse {
    status: string;
    [key: string]: unknown;
}
