import type { IBinaryData, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';

import { JOB_STATUS, MILLISECONDS_PER_SECOND } from '../constants';
import type {
	ISeleniumBaseArtifact,
	ISeleniumBaseAttachmentResponse,
	ISeleniumBaseJobResult,
	ISeleniumBaseJobsResponse,
	ISeleniumBaseProfilesResponse,
	ISeleniumBaseStatusResponse,
	ISeleniumBaseSubmitRequest,
	ISeleniumBaseSubmitResponse,
	SeleniumBaseApiContext,
	SeleniumBaseExecuteApiContext,
} from '../types';

const DEFAULT_HTTP_TIMEOUT_MS = 30_000;
const UPLOAD_HTTP_TIMEOUT_MS = 60_000;
const ARTIFACT_DOWNLOAD_TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}

function isExecuteContext(context: SeleniumBaseApiContext): context is SeleniumBaseExecuteApiContext {
	return typeof (context as SeleniumBaseExecuteApiContext).helpers.prepareBinaryData === 'function';
}

export class SeleniumBaseApiClient {
	constructor(
		private readonly context: SeleniumBaseApiContext,
		private readonly baseUrl: string,
	) {}

	private async request<T>(
		requestOptions: IHttpRequestOptions,
		errorMessage: string,
		itemIndex?: number,
	): Promise<T> {
		try {
			const response = await this.context.helpers.httpRequest({
				timeout: DEFAULT_HTTP_TIMEOUT_MS,
				...requestOptions,
			});

			return response as T;
		} catch (error) {
			throw new NodeApiError(this.context.getNode(), error as JsonObject, {
				message: errorMessage,
				itemIndex,
			});
		}
	}

	private requireExecuteContext(itemIndex?: number): SeleniumBaseExecuteApiContext {
		if (isExecuteContext(this.context)) {
			return this.context;
		}

		throw new NodeOperationError(
			this.context.getNode(),
			'Binary helpers are only available during node execution',
			{ itemIndex },
		);
	}

	async uploadAttachment(
		fileBuffer: Buffer,
		fileName: string,
		mimeType: string,
		itemIndex?: number,
	): Promise<ISeleniumBaseAttachmentResponse> {
		const formData = new FormData();
		formData.append('file', fileBuffer, {
			filename: fileName,
			contentType: mimeType,
		});

		return await this.request<ISeleniumBaseAttachmentResponse>(
			{
				method: 'POST',
				url: `${this.baseUrl}/attachments`,
				headers: formData.getHeaders(),
				body: formData,
				timeout: UPLOAD_HTTP_TIMEOUT_MS,
			},
			'Failed to upload attachment',
			itemIndex,
		);
	}

	async submitJob(
		pythonCode: string,
		profile?: string,
		attachmentId?: string,
		params: Record<string, unknown> = {},
		itemIndex?: number,
	): Promise<ISeleniumBaseSubmitResponse> {
		const payload: ISeleniumBaseSubmitRequest = {
			script: pythonCode,
			params,
		};

		if (profile && profile.trim() !== '') {
			payload.profile = profile.trim();
		}

		if (attachmentId && attachmentId.trim() !== '') {
			payload.attachment_id = attachmentId.trim();
		}

		return await this.request<ISeleniumBaseSubmitResponse>(
			{
				method: 'POST',
				url: `${this.baseUrl}/submit`,
				headers: {
					'Content-Type': 'application/json',
				},
				body: payload,
			},
			'Failed to submit job',
			itemIndex,
		);
	}

	async getJobStatus(jobId: string, itemIndex?: number): Promise<ISeleniumBaseStatusResponse> {
		return await this.request<ISeleniumBaseStatusResponse>(
			{
				method: 'GET',
				url: `${this.baseUrl}/status/${encodeURIComponent(jobId)}`,
			},
			`Failed to get job status for job ${jobId}`,
			itemIndex,
		);
	}

	async getJobResult(jobId: string, itemIndex?: number): Promise<ISeleniumBaseJobResult> {
		return await this.request<ISeleniumBaseJobResult>(
			{
				method: 'GET',
				url: `${this.baseUrl}/result/${encodeURIComponent(jobId)}`,
			},
			`Failed to get job result for job ${jobId}`,
			itemIndex,
		);
	}

	async downloadArtifact(
		jobId: string,
		artifact: ISeleniumBaseArtifact,
		itemIndex?: number,
	): Promise<IBinaryData> {
		const encodedJobId = encodeURIComponent(jobId);
		const encodedFilename = encodeURIComponent(artifact.filename);

		const response = await this.request<{ body: ArrayBuffer }>(
			{
				method: 'GET',
				url: `${this.baseUrl}/artifacts/${encodedJobId}/${encodedFilename}`,
				encoding: 'arraybuffer',
				returnFullResponse: true,
				timeout: ARTIFACT_DOWNLOAD_TIMEOUT_MS,
			},
			`Failed to download artifact ${artifact.filename}`,
			itemIndex,
		);

		const executeContext = this.requireExecuteContext(itemIndex);
		const buffer = Buffer.from(response.body as ArrayBuffer);

		return await executeContext.helpers.prepareBinaryData(buffer, artifact.filename, artifact.type);
	}

	async downloadAllArtifacts(
		jobId: string,
		result: ISeleniumBaseJobResult,
		itemIndex?: number,
	): Promise<Record<string, IBinaryData>> {
		const binaryData: Record<string, IBinaryData> = {};

		if (!result.artifacts || result.artifacts.length === 0) {
			return binaryData;
		}

		for (const artifact of result.artifacts) {
			binaryData[artifact.filename] = await this.downloadArtifact(jobId, artifact, itemIndex);
		}

		return binaryData;
	}

	async cleanupJob(jobId: string, itemIndex?: number): Promise<void> {
		await this.request<void>(
			{
				method: 'DELETE',
				url: `${this.baseUrl}/job/${encodeURIComponent(jobId)}`,
			},
			`Failed to cleanup job ${jobId}`,
			itemIndex,
		);
	}

	async listJobs(limit: number, offset: number): Promise<ISeleniumBaseJobsResponse> {
		return await this.request<ISeleniumBaseJobsResponse>(
			{
				method: 'GET',
				url: `${this.baseUrl}/jobs`,
				qs: { limit, offset },
			},
			'Failed to list jobs',
		);
	}

	async listProfiles(limit: number): Promise<ISeleniumBaseProfilesResponse> {
		return await this.request<ISeleniumBaseProfilesResponse>(
			{
				method: 'GET',
				url: `${this.baseUrl}/profiles`,
				qs: { limit },
			},
			'Failed to list profiles',
		);
	}

	async cleanupProfile(profileName: string, itemIndex?: number): Promise<void> {
		await this.request<void>(
			{
				method: 'DELETE',
				url: `${this.baseUrl}/profile/${encodeURIComponent(profileName)}`,
			},
			`Failed to cleanup profile ${profileName}`,
			itemIndex,
		);
	}

	async waitForJobCompletion(
		jobId: string,
		initialStatus: string,
		pollingInterval: number,
		timeout: number,
		itemIndex: number,
	): Promise<void> {
		const normalizedPollingInterval = Number(pollingInterval);
		const normalizedTimeout = Number(timeout);

		if (!Number.isFinite(normalizedPollingInterval) || normalizedPollingInterval < 1) {
			throw new NodeOperationError(
				this.context.getNode(),
				`Polling Interval must be a number greater than or equal to 1. Received: ${pollingInterval}`,
				{ itemIndex },
			);
		}

		if (!Number.isFinite(normalizedTimeout) || normalizedTimeout <= 0) {
			throw new NodeOperationError(
				this.context.getNode(),
				`Timeout must be a number greater than 0. Received: ${timeout}`,
				{ itemIndex },
			);
		}

		const startTime = Date.now();
		const timeoutMs = normalizedTimeout * MILLISECONDS_PER_SECOND;
		let status = `${initialStatus ?? ''}`.trim().toLowerCase();
		if (status === '') {
			status = JOB_STATUS.PENDING;
		}

		while (status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING) {
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime > timeoutMs) {
				throw new NodeOperationError(
					this.context.getNode(),
					`Job ${jobId} timed out after ${normalizedTimeout} seconds`,
					{ itemIndex },
				);
			}

			await sleep(normalizedPollingInterval * MILLISECONDS_PER_SECOND);

			const statusResponse = await this.getJobStatus(jobId, itemIndex);
			status = `${statusResponse.status ?? ''}`.trim().toLowerCase();
			if (status === '') {
				throw new NodeOperationError(this.context.getNode(), `Job ${jobId} returned an empty status`, {
					itemIndex,
				});
			}

			if (
				status !== JOB_STATUS.PENDING &&
				status !== JOB_STATUS.RUNNING &&
				status !== JOB_STATUS.COMPLETED &&
				status !== JOB_STATUS.FAILED
			) {
				throw new NodeOperationError(
					this.context.getNode(),
					`Job ${jobId} returned an unknown status: ${status}`,
					{ itemIndex },
				);
			}
		}
	}
}
