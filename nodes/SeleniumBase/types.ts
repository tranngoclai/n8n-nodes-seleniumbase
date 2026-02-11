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
 * Job item in the jobs list
 */
export interface ISeleniumBaseJobItem {
    job_id: string;
    status: string;
    profile?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
}

/**
 * Response from listing jobs
 */
export interface ISeleniumBaseJobsResponse {
    jobs: ISeleniumBaseJobItem[];
}

/**
 * Profile item in the profiles list
 */
export interface ISeleniumBaseProfileItem {
    profile_name: string;
    created_at: string;
    last_used_at?: string;
    job_count: number;
}

/**
 * Response from listing profiles
 */
export interface ISeleniumBaseProfilesResponse {
    profiles: ISeleniumBaseProfileItem[];
}

/**
 * Node operation types
 */
export type SeleniumBaseOperation =
    | 'executeScript'
    | 'getStatus'
    | 'getResult'
    | 'cleanupJob'
    | 'cleanupProfile';

/**
 * Job status values matching JOB_STATUS constants
 */
export type SeleniumBaseJobStatus = 'pending' | 'running' | 'completed' | 'failed';

