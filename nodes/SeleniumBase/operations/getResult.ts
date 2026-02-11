import type { IBinaryData, IDataObject } from 'n8n-workflow';

import { validateRequiredString } from '../helpers/errors';
import { getBooleanOptionParameter } from '../helpers/options';
import type { SeleniumBaseOperationHandler } from './types';

export const getResultOperation: SeleniumBaseOperationHandler = async ({
	context,
	apiClient,
	itemIndex,
}) => {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;
	validateRequiredString(jobId, 'Job ID', context.getNode(), itemIndex);

	const result = await apiClient.getJobResult(jobId, itemIndex);
	const downloadArtifacts = getBooleanOptionParameter(
		context,
		itemIndex,
		'downloadArtifacts',
		'downloadArtifacts',
		true,
	);
	const cleanJobAfterExecution = getBooleanOptionParameter(
		context,
		itemIndex,
		'cleanJobAfterExecution',
		'cleanJobAfterExecution',
		true,
	);

	let binaryData: Record<string, IBinaryData> | undefined;
	if (downloadArtifacts) {
		const artifacts = await apiClient.downloadAllArtifacts(jobId, result, itemIndex);
		binaryData = Object.keys(artifacts).length > 0 ? artifacts : undefined;
	}

	if (cleanJobAfterExecution) {
		await apiClient.cleanupJob(jobId, itemIndex);
	}

	return {
		json: result as unknown as IDataObject,
		binary: binaryData,
		pairedItem: itemIndex,
	};
};
