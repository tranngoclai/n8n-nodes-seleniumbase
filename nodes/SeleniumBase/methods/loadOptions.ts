import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { SeleniumBaseApiClient } from '../transport/apiClient';

const LOAD_OPTIONS_LIMIT = 100;

async function createApiClient(context: ILoadOptionsFunctions): Promise<SeleniumBaseApiClient> {
	const credentials = await context.getCredentials('seleniumBaseApi');
	const baseUrl = credentials.baseUrl as string;
	return new SeleniumBaseApiClient(context, baseUrl);
}

export const loadOptionsMethods = {
	async getJobs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const apiClient = await createApiClient(this);
			const response = await apiClient.listJobs(LOAD_OPTIONS_LIMIT, 0);

			return response.jobs.map((job) => ({
				name: `${job.job_id} (${job.status})`,
				value: job.job_id,
			}));
		} catch {
			return [];
		}
	},

	async getProfiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		try {
			const apiClient = await createApiClient(this);
			const response = await apiClient.listProfiles(LOAD_OPTIONS_LIMIT);

			return response.profiles.map((profile) => ({
				name: `${profile.profile_name} (${profile.job_count} jobs)`,
				value: profile.profile_name,
			}));
		} catch {
			return [];
		}
	},
};
