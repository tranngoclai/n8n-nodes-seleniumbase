/**
 * SeleniumBase API Client
 *
 * Handles all API operations for the SeleniumBase server.
 */

import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';

import { JOB_STATUS, MILLISECONDS_PER_SECOND } from './constants';
import type {
    ISeleniumBaseArtifact,
    ISeleniumBaseJobResult,
    ISeleniumBaseStatusResponse,
    ISeleniumBaseSubmitResponse,
    ISeleniumBaseJobsResponse,
    ISeleniumBaseProfilesResponse,
} from './types';

/**
 * Pauses execution for the specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * API client for interacting with the SeleniumBase server
 */
export class SeleniumBaseApiClient {
    constructor(
        private readonly context: IExecuteFunctions,
        private readonly baseUrl: string,
    ) { }

    /**
     * Submits a Python script as a job to the SeleniumBase API
     * @param pythonCode - The Python code to execute
     * @param profile - Optional browser profile name to use
     * @returns The submit response containing job_id and status
     */
    async submitJob(pythonCode: string, profile?: string): Promise<ISeleniumBaseSubmitResponse> {
        const formData = new FormData();

        formData.append('file', Buffer.from(pythonCode, 'utf-8'), {
            filename: 'script.py',
            contentType: 'text/x-python',
        });

        if (profile && profile.trim() !== '') {
            formData.append('profile', profile.trim());
        }

        try {
            const response = await this.context.helpers.httpRequest({
                method: 'POST',
                url: `${this.baseUrl}/submit`,
                headers: formData.getHeaders(),
                body: formData,
            });

            return response as ISeleniumBaseSubmitResponse;
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to submit job: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Retrieves the current status of a job
     * @param jobId - The ID of the job to check
     * @returns The status response
     */
    async getJobStatus(jobId: string): Promise<ISeleniumBaseStatusResponse> {
        try {
            const response = await this.context.helpers.httpRequest({
                method: 'GET',
                url: `${this.baseUrl}/status/${jobId}`,
            });

            return response as ISeleniumBaseStatusResponse;
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to get job status for job ${jobId}: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Retrieves the complete result of a job
     * @param jobId - The ID of the job
     * @returns The job result including artifacts and logs
     */
    async getJobResult(jobId: string): Promise<ISeleniumBaseJobResult> {
        try {
            const response = await this.context.helpers.httpRequest({
                method: 'GET',
                url: `${this.baseUrl}/result/${jobId}`,
            });

            return response as ISeleniumBaseJobResult;
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to get job result for job ${jobId}: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Downloads a job artifact as binary data
     * @param jobId - The ID of the job
     * @param artifact - The artifact information
     * @returns Binary data for the artifact
     */
    async downloadArtifact(jobId: string, artifact: ISeleniumBaseArtifact): Promise<IBinaryData> {
        try {
            const response = await this.context.helpers.httpRequest({
                method: 'GET',
                url: `${this.baseUrl}/artifacts/${jobId}/${artifact.filename}`,
                encoding: 'arraybuffer',
                returnFullResponse: true,
            });

            const buffer = Buffer.from(response.body as ArrayBuffer);

            return await this.context.helpers.prepareBinaryData(
                buffer,
                artifact.filename,
                artifact.type,
            );
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to download artifact ${artifact.filename}: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Downloads all artifacts from a job result as binary data
     * @param jobId - The ID of the job
     * @param result - The job result containing artifacts
     * @returns Object mapping filenames to binary data
     */
    async downloadAllArtifacts(
        jobId: string,
        result: ISeleniumBaseJobResult,
    ): Promise<Record<string, IBinaryData>> {
        const binaryData: Record<string, IBinaryData> = {};

        if (!result.artifacts || result.artifacts.length === 0) {
            return binaryData;
        }

        for (const artifact of result.artifacts) {
            binaryData[artifact.filename] = await this.downloadArtifact(jobId, artifact);
        }

        return binaryData;
    }

    /**
     * Cleans up a job and its artifacts
     * @param jobId - The ID of the job to clean up
     */
    async cleanupJob(jobId: string): Promise<void> {
        try {
            await this.context.helpers.httpRequest({
                method: 'DELETE',
                url: `${this.baseUrl}/job/${jobId}`,
            });
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to cleanup job ${jobId}: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Lists all jobs with pagination
     * @param limit - Maximum number of jobs to return
     * @param offset - Number of jobs to skip
     * @returns The jobs list response
     */
    async listJobs(limit: number, offset: number): Promise<ISeleniumBaseJobsResponse> {
        try {
            const response = await this.context.helpers.httpRequest({
                method: 'GET',
                url: `${this.baseUrl}/jobs`,
                qs: { limit, offset },
            });

            return response as ISeleniumBaseJobsResponse;
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to list jobs: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Lists all browser profiles
     * @param limit - Maximum number of profiles to return
     * @returns The profiles list response
     */
    async listProfiles(limit: number): Promise<ISeleniumBaseProfilesResponse> {
        try {
            const response = await this.context.helpers.httpRequest({
                method: 'GET',
                url: `${this.baseUrl}/profiles`,
                qs: { limit },
            });

            return response as ISeleniumBaseProfilesResponse;
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to list profiles: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Cleans up a browser profile
     * @param profileName - The name of the profile to clean up
     */
    async cleanupProfile(profileName: string): Promise<void> {
        try {
            await this.context.helpers.httpRequest({
                method: 'DELETE',
                url: `${this.baseUrl}/profile/${profileName}`,
            });
        } catch (error) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Failed to cleanup profile ${profileName}: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Waits for a job to complete by polling its status
     * @param jobId - The ID of the job
     * @param initialStatus - The initial status of the job
     * @param pollingInterval - Interval in seconds between status checks
     * @param timeout - Maximum time to wait in seconds
     * @param itemIndex - The item index for error reporting
     */
    async waitForJobCompletion(
        jobId: string,
        initialStatus: string,
        pollingInterval: number,
        timeout: number,
        itemIndex: number,
    ): Promise<void> {
        const startTime = Date.now();
        const timeoutMs = timeout * MILLISECONDS_PER_SECOND;
        let status = initialStatus;

        while (status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING) {
            const elapsedTime = Date.now() - startTime;

            if (elapsedTime > timeoutMs) {
                throw new NodeOperationError(
                    this.context.getNode(),
                    `Job ${jobId} timed out after ${timeout} seconds`,
                    { itemIndex },
                );
            }

            await sleep(pollingInterval * MILLISECONDS_PER_SECOND);

            const statusResponse = await this.getJobStatus(jobId);
            status = statusResponse.status;
        }

        if (status === JOB_STATUS.FAILED) {
            throw new NodeOperationError(
                this.context.getNode(),
                `Job ${jobId} failed. Check the job result for error details.`,
                { itemIndex },
            );
        }
    }
}
