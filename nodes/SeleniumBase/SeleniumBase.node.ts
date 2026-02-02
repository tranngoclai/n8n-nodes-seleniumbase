/**
 * SeleniumBase Node for n8n
 *
 * Executes Python scraping scripts using the SeleniumBase API.
 *
 * @see https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/interfaces.ts
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IBinaryData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { DEFAULT_POLLING_INTERVAL, DEFAULT_TIMEOUT } from './constants';
import { seleniumBaseDescription } from './description';
import { SeleniumBaseApiClient } from './SeleniumBaseApiClient';
import type { SeleniumBaseOperation } from './types';

/**
 * Validates that a string parameter is not empty
 */
function validateRequiredString(
	value: string,
	paramName: string,
	node: ReturnType<IExecuteFunctions['getNode']>,
): void {
	if (!value || value.trim() === '') {
		throw new NodeOperationError(node, `${paramName} cannot be empty`);
	}
}

/**
 * Handles the Execute Script operation
 */
async function handleExecuteScript(
	context: IExecuteFunctions,
	apiClient: SeleniumBaseApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const pythonCode = context.getNodeParameter('pythonCode', itemIndex) as string;
	const waitForCompletion = context.getNodeParameter('waitForCompletion', itemIndex) as boolean;
	const maintainSessionConsistency = context.getNodeParameter('maintainSessionConsistency', itemIndex, false) as boolean;

	validateRequiredString(pythonCode, 'Python Code', context.getNode());

	let profileName: string | undefined;

	if (maintainSessionConsistency) {
		// Generate profile ID from node name only
		const node = context.getNode();
		profileName = node.name.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize node name
	}

	const submitResponse = await apiClient.submitJob(pythonCode, profileName);

	if (!waitForCompletion) {
		return {
			json: submitResponse as unknown as IDataObject,
			pairedItem: itemIndex,
		};
	}

	const pollingInterval = context.getNodeParameter(
		'pollingInterval',
		itemIndex,
		DEFAULT_POLLING_INTERVAL,
	) as number;
	const timeout = context.getNodeParameter('timeout', itemIndex, DEFAULT_TIMEOUT) as number;

	await apiClient.waitForJobCompletion(
		submitResponse.job_id,
		submitResponse.status,
		pollingInterval,
		timeout,
		itemIndex,
	);

	const result = await apiClient.getJobResult(submitResponse.job_id);
	const downloadArtifacts = context.getNodeParameter(
		'downloadArtifacts',
		itemIndex,
		true,
	) as boolean;
	const cleanJobAfterExecution = context.getNodeParameter(
		'cleanJobAfterExecution',
		itemIndex,
		true,
	) as boolean;

	let binaryData: Record<string, IBinaryData> | undefined;
	if (downloadArtifacts) {
		const artifacts = await apiClient.downloadAllArtifacts(submitResponse.job_id, result);
		binaryData = Object.keys(artifacts).length > 0 ? artifacts : undefined;
	}

	if (cleanJobAfterExecution) {
		await apiClient.cleanupJob(submitResponse.job_id);
	}

	return {
		json: result as unknown as IDataObject,
		binary: binaryData,
		pairedItem: itemIndex,
	};
}

/**
 * Handles the Get Status operation
 */
async function handleGetStatus(
	context: IExecuteFunctions,
	apiClient: SeleniumBaseApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;

	validateRequiredString(jobId, 'Job ID', context.getNode());

	const statusResponse = await apiClient.getJobStatus(jobId);

	return {
		json: statusResponse as unknown as IDataObject,
		pairedItem: itemIndex,
	};
}

/**
 * Handles the Get Result operation
 */
async function handleGetResult(
	context: IExecuteFunctions,
	apiClient: SeleniumBaseApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;

	validateRequiredString(jobId, 'Job ID', context.getNode());

	const result = await apiClient.getJobResult(jobId);
	const downloadArtifacts = context.getNodeParameter(
		'downloadArtifacts',
		itemIndex,
		true,
	) as boolean;
	const cleanJobAfterExecution = context.getNodeParameter(
		'cleanJobAfterExecution',
		itemIndex,
		true,
	) as boolean;

	let binaryData: Record<string, IBinaryData> | undefined;
	if (downloadArtifacts) {
		const artifacts = await apiClient.downloadAllArtifacts(jobId, result);
		binaryData = Object.keys(artifacts).length > 0 ? artifacts : undefined;
	}

	if (cleanJobAfterExecution) {
		await apiClient.cleanupJob(jobId);
	}

	return {
		json: result as unknown as IDataObject,
		binary: binaryData,
		pairedItem: itemIndex,
	};
}

/**
 * Handles the Clean Up Job operation
 */
async function handleCleanupJob(
	context: IExecuteFunctions,
	apiClient: SeleniumBaseApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;

	validateRequiredString(jobId, 'Job ID', context.getNode());

	await apiClient.cleanupJob(jobId);

	return {
		json: { message: `Job ${jobId} cleaned up successfully` } as IDataObject,
		pairedItem: itemIndex,
	};
}

/**
 * Handles the Clean Up Profile operation
 */
async function handleCleanupProfile(
	context: IExecuteFunctions,
	apiClient: SeleniumBaseApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const profileName = context.getNodeParameter('profileName', itemIndex) as string;

	validateRequiredString(profileName, 'Profile Name', context.getNode());

	await apiClient.cleanupProfile(profileName);

	return {
		json: { message: `Profile ${profileName} cleaned up successfully` } as IDataObject,
		pairedItem: itemIndex,
	};
}

/**
 * SeleniumBase node implementation
 *
 * Implements INodeType interface from n8n-workflow
 */
export class SeleniumBase implements INodeType {
	description: INodeTypeDescription = seleniumBaseDescription;

	methods = {
		loadOptions: {
			async getJobs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('seleniumBaseApi');
				const baseUrl = credentials.baseUrl as string;
				const apiClient = new SeleniumBaseApiClient(this as unknown as IExecuteFunctions, baseUrl);

				try {
					const response = await apiClient.listJobs(100, 0);
					return response.jobs.map((job) => ({
						name: `${job.job_id} (${job.status})`,
						value: job.job_id,
					}));
				} catch (error) {
					return [];
				}
			},
			async getProfiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('seleniumBaseApi');
				const baseUrl = credentials.baseUrl as string;
				const apiClient = new SeleniumBaseApiClient(this as unknown as IExecuteFunctions, baseUrl);

				try {
					const response = await apiClient.listProfiles(100);
					return response.profiles.map((profile) => ({
						name: `${profile.profile_name} (${profile.job_count} jobs)`,
						value: profile.profile_name,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	/**
	 * Executes the node operation
	 *
	 * @param this - IExecuteFunctions context provided by n8n
	 * @returns Array of node execution data
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('seleniumBaseApi');
		const baseUrl = credentials.baseUrl as string;

		const apiClient = new SeleniumBaseApiClient(this, baseUrl);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter(
					'operation',
					itemIndex,
				) as SeleniumBaseOperation;

				switch (operation) {
					case 'executeScript': {
						const result = await handleExecuteScript(this, apiClient, itemIndex);
						returnData.push(result);
						break;
					}
					case 'getStatus': {
						const result = await handleGetStatus(this, apiClient, itemIndex);
						returnData.push(result);
						break;
					}
					case 'getResult': {
						const result = await handleGetResult(this, apiClient, itemIndex);
						returnData.push(result);
						break;
					}
					case 'cleanupJob': {
						const result = await handleCleanupJob(this, apiClient, itemIndex);
						returnData.push(result);
						break;
					}
					case 'cleanupProfile': {
						const result = await handleCleanupProfile(this, apiClient, itemIndex);
						returnData.push(result);
						break;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: itemIndex,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
