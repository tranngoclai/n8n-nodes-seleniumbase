import type { IDataObject } from 'n8n-workflow';

import { validateRequiredString } from '../helpers/errors';
import type { SeleniumBaseOperationHandler } from './types';

export const getStatusOperation: SeleniumBaseOperationHandler = async ({
	context,
	apiClient,
	itemIndex,
}) => {
	const jobId = context.getNodeParameter('jobId', itemIndex) as string;
	validateRequiredString(jobId, 'Job ID', context.getNode(), itemIndex);

	const statusResponse = await apiClient.getJobStatus(jobId, itemIndex);

	return {
		json: statusResponse as unknown as IDataObject,
		pairedItem: itemIndex,
	};
};
