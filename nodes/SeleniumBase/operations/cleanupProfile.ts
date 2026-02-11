import type { IDataObject } from 'n8n-workflow';

import { validateRequiredString } from '../helpers/errors';
import type { SeleniumBaseOperationHandler } from './types';

export const cleanupProfileOperation: SeleniumBaseOperationHandler = async ({
	context,
	apiClient,
	itemIndex,
}) => {
	const profileName = context.getNodeParameter('profileName', itemIndex) as string;
	validateRequiredString(profileName, 'Profile Name', context.getNode(), itemIndex);

	await apiClient.cleanupProfile(profileName, itemIndex);

	return {
		json: { message: `Profile ${profileName} cleaned up successfully` } as IDataObject,
		pairedItem: itemIndex,
	};
};
