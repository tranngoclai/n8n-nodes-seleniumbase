import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { loadOptionsMethods } from './methods/loadOptions';
import { operationHandlers } from './operations';
import { seleniumBaseProperties } from './properties';
import { SeleniumBaseApiClient } from './transport/apiClient';
import type { SeleniumBaseOperation } from './types';

export class SeleniumBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SeleniumBase',
		name: 'seleniumBase',
		icon: 'file:seleniumbase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute Python scraping scripts using SeleniumBase API',
		defaults: {
			name: 'SeleniumBase',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'seleniumBaseApi',
				required: true,
			},
		],
		properties: seleniumBaseProperties,
	};

	methods = {
		loadOptions: loadOptionsMethods,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('seleniumBaseApi');
		const baseUrl = credentials.baseUrl as string;
		const apiClient = new SeleniumBaseApiClient(this, baseUrl);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as SeleniumBaseOperation;
				const handler = operationHandlers[operation];
				if (!handler) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex,
					});
				}

				const result = await handler({
					context: this,
					apiClient,
					itemIndex,
					inputItem: items[itemIndex],
				});
				returnData.push(result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : 'Unknown error' },
						pairedItem: itemIndex,
					});
					continue;
				}

				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
