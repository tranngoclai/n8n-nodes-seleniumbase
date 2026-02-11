import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

function hasOwnProperty(object: IDataObject, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(object, key);
}

function getLegacyValue(
	context: IExecuteFunctions,
	itemIndex: number,
	legacyKey: string,
): unknown {
	try {
		return context.getNodeParameter(legacyKey, itemIndex);
	} catch {
		const parameters = context.getNode().parameters as IDataObject;
		return parameters[legacyKey];
	}
}

export function getBooleanOptionParameter(
	context: IExecuteFunctions,
	itemIndex: number,
	optionKey: string,
	legacyKey: string,
	defaultValue: boolean,
): boolean {
	const parameters = context.getNode().parameters as IDataObject;
	const options = parameters.options as IDataObject | undefined;

	if (options && hasOwnProperty(options, optionKey)) {
		return context.getNodeParameter(`options.${optionKey}`, itemIndex, defaultValue) as boolean;
	}

	if (!hasOwnProperty(parameters, legacyKey)) {
		return defaultValue;
	}

	const legacyValue = getLegacyValue(context, itemIndex, legacyKey);
	if (typeof legacyValue === 'boolean') {
		return legacyValue;
	}

	if (typeof legacyValue === 'string') {
		const normalized = legacyValue.trim().toLowerCase();
		if (normalized === 'true') {
			return true;
		}
		if (normalized === 'false') {
			return false;
		}
	}

	return defaultValue;
}

export function getNumberOptionParameter(
	context: IExecuteFunctions,
	itemIndex: number,
	optionKey: string,
	legacyKey: string,
	defaultValue: number,
): number {
	const parameters = context.getNode().parameters as IDataObject;
	const options = parameters.options as IDataObject | undefined;

	if (options && hasOwnProperty(options, optionKey)) {
		return context.getNodeParameter(`options.${optionKey}`, itemIndex, defaultValue) as number;
	}

	if (!hasOwnProperty(parameters, legacyKey)) {
		return defaultValue;
	}

	const legacyValue = getLegacyValue(context, itemIndex, legacyKey);
	if (typeof legacyValue === 'number' && Number.isFinite(legacyValue)) {
		return legacyValue;
	}

	if (typeof legacyValue === 'string') {
		const parsed = Number(legacyValue);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return defaultValue;
}
