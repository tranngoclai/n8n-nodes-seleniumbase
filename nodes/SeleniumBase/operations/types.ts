import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { SeleniumBaseApiClient } from '../transport/apiClient';

export interface SeleniumBaseOperationContext {
	context: IExecuteFunctions;
	apiClient: SeleniumBaseApiClient;
	itemIndex: number;
	inputItem: INodeExecutionData;
}

export type SeleniumBaseOperationHandler = (
	operationContext: SeleniumBaseOperationContext,
) => Promise<INodeExecutionData>;
