/**
 * TypeScript type definitions for Dataiku API responses
 */

export interface DataikuUploadResponse {
    status: 'ok' | 'error';
    message?: string;
    saved_as: string;
    original_filename: string;
    size_bytes: number;
    timestamp: number;
    job_id?: string;
}

export interface DataikuHealthResponse {
    status: 'healthy' | 'unhealthy';
    dataiku_host: string;
    project_key: string;
    folder_id: string;
    timestamp: string;
    error?: string;
}

export interface DataikuFileInfo {
    path: string;
    size?: number;
    lastModified?: string;
}

export interface DataikuListFilesResponse {
    status: 'ok';
    count: number;
    files: DataikuFileInfo[];
}

export interface DataikuError {
    detail: string;
}

export interface DataikuScenarioResponse {
    status: 'ok';
    message: string;
    saved_as: string;
    original_filename: string;
    size_bytes: number;
    timestamp: number;
    scenario_id: string;
    scenario_run_id: string;
}
