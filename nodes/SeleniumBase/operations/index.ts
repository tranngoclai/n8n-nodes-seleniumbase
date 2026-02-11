import type { SeleniumBaseOperation } from '../types';
import { cleanupJobOperation } from './cleanupJob';
import { cleanupProfileOperation } from './cleanupProfile';
import { executeScriptOperation } from './executeScript';
import { getResultOperation } from './getResult';
import { getStatusOperation } from './getStatus';
import type { SeleniumBaseOperationHandler } from './types';

export const operationHandlers: Record<SeleniumBaseOperation, SeleniumBaseOperationHandler> = {
	cleanupJob: cleanupJobOperation,
	cleanupProfile: cleanupProfileOperation,
	executeScript: executeScriptOperation,
	getResult: getResultOperation,
	getStatus: getStatusOperation,
};

export type { SeleniumBaseOperationHandler } from './types';
