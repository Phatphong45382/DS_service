/**
 * API Client for Dataiku Backend Integration
 * 
 * This module provides functions to interact with the FastAPI backend
 * that connects to Dataiku DSS.
 */

import {
    DataikuUploadResponse,
    DataikuHealthResponse,
    DataikuListFilesResponse,
    DataikuError
} from './types/dataiku';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';
const API_URL = `${API_BASE_URL}/api/v1`;

/**
 * Standard API Response structure
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    meta: {
        request_id?: string;
        timestamp: string;
    };
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Custom error class for Dataiku API errors
 */
export class DataikuAPIError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public detail?: string,
        public code?: string
    ) {
        super(message);
        this.name = 'DataikuAPIError';
    }
}

/**
 * Helper to handle fetch and standardized responses
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Accept': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            let errorCode = undefined;
            try {
                const errorData = await response.json();
                // Dataiku/FastAPI error structure often has { error: { message: "..." } } or { detail: "..." }
                errorMsg = errorData.error?.message ||
                    (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) ||
                    errorMsg;
                errorCode = errorData.error?.code;
                console.error("API Error Response:", errorData);
            } catch (e) {
                // Not JSON or parsing failed
                console.error("API Error (Non-JSON):", response.statusText);
            }
            throw new DataikuAPIError(errorMsg, response.status, undefined, errorCode);
        }

        const result: ApiResponse<T> = await response.json();

        if (!result.success) {
            console.error("API Logic Error:", result.error);
            throw new DataikuAPIError(
                result.error?.message || 'API request failed',
                response.status,
                undefined,
                result.error?.code
            );
        }

        return result.data as T;
    } catch (error) {
        console.error("fetchAPI Exception:", error);
        if (error instanceof DataikuAPIError) throw error;

        // Network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new DataikuAPIError(
                '⚠️ ไม่สามารถเชื่อมต่อกับ backend ได้',
                undefined,
                `กรุณาตรวจสอบว่า FastAPI server กำลังทำงานอยู่ที่ ${API_BASE_URL}`
            );
        }

        throw new DataikuAPIError(
            error instanceof Error ? error.message : String(error)
        );
    }
}

/**
 * Check if the FastAPI backend is healthy
 */
export async function checkBackendHealth(): Promise<DataikuHealthResponse> {
    return fetchAPI<DataikuHealthResponse>('/health');
}

/**
 * Upload a CSV file to the scoring input folder
 */
export async function uploadFileToDataiku(file: File): Promise<DataikuUploadResponse> {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new DataikuAPIError('รองรับเฉพาะไฟล์ CSV เท่านั้น');
    }

    const formData = new FormData();
    formData.append('file', file);

    return fetchAPI<DataikuUploadResponse>('/scoring/upload', {
        method: 'POST',
        body: formData,
    });
}

/**
 * Get latest forecast results
 */
export async function getForecastResults(): Promise<any> {
    return fetchAPI<any>('/scoring/results/latest');
}

/**
 * Trigger forecast scenario
 */
export async function runForecast(scenarioId: string = 'TEST'): Promise<{ run_id: string; scenario_id: string }> {
    return fetchAPI<{ run_id: string; scenario_id: string }>(`/scoring/run/${scenarioId}`, {
        method: 'POST',
    });
}

/**
 * Get job status (scenario run)
 */
export async function getJobStatus(jobId: string, scenarioId: string = 'TEST'): Promise<any> {
    return fetchAPI<any>(`/scoring/jobs/${scenarioId}/${jobId}`);
}

/**
 * Get aggregated dashboard data from Dataiku dataset
 */
export async function getDashboardData(params: Record<string, any> = {}): Promise<any[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, String(v)));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });

    const queryString = queryParams.toString();
    const endpoint = `/dashboard/summary${queryString ? `?${queryString}` : ''}`;

    return fetchAPI<any[]>(endpoint);
}

/**
 * Get unique filter values from Dataiku dataset
 */
export async function getDashboardFilters(params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== 'All') {
            queryParams.append(key, String(value));
        }
    });
    const queryString = queryParams.toString();
    const endpoint = `/dashboard/filters${queryString ? `?${queryString}` : ''}`;
    return fetchAPI<any>(endpoint);
}

/**
 * Get aggregated analytics data from new dataset
 */
export async function getAnalyticsData(params: Record<string, any> = {}, breakdown?: string): Promise<any[]> {
    const queryParams = new URLSearchParams();

    if (breakdown) {
        queryParams.append('breakdown', breakdown);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            // Handle specific types if needed
            if (key === 'has_promotion') {
                // Ensure it's 0 or 1 if it's not 'all'
                queryParams.append(key, String(value));
            } else if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, String(v)));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });

    const queryString = queryParams.toString();
    const endpoint = `/analytics/summary${queryString ? `?${queryString}` : ''}`;

    return fetchAPI<any[]>(endpoint);
}

/**
 * Get unique filter values from analytics dataset
 */
export async function getAnalyticsFilters(params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== 'All') {
            queryParams.append(key, String(value));
        }
    });
    const queryString = queryParams.toString();
    const endpoint = `/analytics/filters${queryString ? `?${queryString}` : ''}`;
    return fetchAPI<any>(endpoint);
}

/**
 * Get deep dive analytics data
 */
export async function getDeepDiveAnalytics(params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            if (key === 'has_promotion') {
                queryParams.append(key, String(value));
            } else if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, String(v)));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });
    const queryString = queryParams.toString();
    const endpoint = `/analytics/deep-dive${queryString ? `?${queryString}` : ''}`;
    return fetchAPI<any>(endpoint);
}

/**
 * Download forecast result file (Direct URL)
 */
export function downloadForecastResultFile(filename?: string): void {
    // Note: Standardized response doesn't apply to binary downloads
    const url = `${API_URL}/scoring/results/download${filename ? `?filename=${encodeURIComponent(filename)}` : ''}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'forecast_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Keep old functions for compatibility if needed, but update their implementations
export async function listDataikuFiles(): Promise<DataikuListFilesResponse> {
    // For now, return empty or implement a general list endpoint
    return { status: 'ok', count: 0, files: [] };
}

export async function uploadAndTriggerScenario(file: File, scenarioId: string = 'TEST'): Promise<any> {
    const upload = await uploadFileToDataiku(file);
    const run = await runForecast(scenarioId);
    return { ...upload, ...run };
}

export async function readCsvFromDataiku(filename: string): Promise<any> {
    // This could be mapped to a specific folder-read endpoint if needed
    throw new Error('Endpoint not implemented in modular API yet');
}

