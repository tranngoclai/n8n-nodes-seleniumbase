/**
 * Type definitions for SeleniumBase node
 *
 * Based on n8n workflow interfaces:
 * https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts
 */

/**
 * Artifact information returned by the SeleniumBase API
 */
export interface ISeleniumBaseArtifact {
    filename: string;
    path: string;
    type: string;
    size: number;
}

/**
 * Job logs containing stdout and stderr
 */
export interface ISeleniumBaseJobLogs {
    stdout: string;
    stderr: string;
}

/**
 * Full job result from the SeleniumBase API
 * Compatible with n8n's IDataObject when cast
 */
export interface ISeleniumBaseJobResult {
    job_id: string;
    status: string;
    artifacts: ISeleniumBaseArtifact[];
    logs: ISeleniumBaseJobLogs;
    error?: string;
    started_at?: string;
    completed_at?: string;
}

/**
 * Response from submitting a new job
 * Compatible with n8n's IDataObject when cast
 */
export interface ISeleniumBaseSubmitResponse {
    job_id: string;
    status: string;
    message: string;
}

/**
 * Response from checking job status
 * Compatible with n8n's IDataObject when cast
 */
export interface ISeleniumBaseStatusResponse {
    job_id: string;
    status: string;
    started_at?: string;
    completed_at?: string;
}

/**
 * Node operation types
 */
export type SeleniumBaseOperation = 'executeScript' | 'getStatus' | 'getResult';

/**
 * Job status values matching JOB_STATUS constants
 */
export type SeleniumBaseJobStatus = 'pending' | 'running' | 'completed' | 'failed';
