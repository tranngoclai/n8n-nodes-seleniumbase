import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

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
 */
export interface ISeleniumBaseSubmitResponse {
	job_id: string;
	status: string;
	message: string;
}

/**
 * Request payload for submitting a new job
 */
export interface ISeleniumBaseSubmitRequest {
	script: string;
	attachment_id?: string;
	profile?: string;
	params: Record<string, unknown>;
}

/**
 * Response from uploading an attachment
 */
export interface ISeleniumBaseAttachmentResponse {
	attachment_id: string;
	filename: string;
	path: string;
	type: string;
	size: number;
	created_at: string;
	expires_at: string;
}

/**
 * Response from checking job status
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

/**
 * Context accepted by the API transport layer
 */
export type SeleniumBaseApiContext =
	| Pick<IExecuteFunctions, 'helpers' | 'getNode'>
	| Pick<ILoadOptionsFunctions, 'helpers' | 'getNode'>;

/**
 * Execute-only context accepted by binary helpers
 */
export type SeleniumBaseExecuteApiContext = Pick<IExecuteFunctions, 'helpers' | 'getNode'>;
