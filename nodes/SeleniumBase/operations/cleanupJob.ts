import type { IDataObject } from 'n8n-workflow';

import { validateRequiredString } from '../helpers/errors';
import type { SeleniumBaseOperationHandler } from './types';

export const cleanupJobOperation: SeleniumBaseOperationHandler = async ({
	context,
	apiClient,
	itemIndex,
}) => {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;
	validateRequiredString(jobId, 'Job ID', context.getNode(), itemIndex);

	await apiClient.cleanupJob(jobId, itemIndex);

	return {
		json: { message: `Job ${jobId} cleaned up successfully` } as IDataObject,
		pairedItem: itemIndex,
	};
};
