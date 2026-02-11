import type { IDataObject } from 'n8n-workflow';

/**
 * Converts fixedCollection parameters into a plain object.
 */
export function buildParamsObject(rawParams: IDataObject): Record<string, unknown> {
	const values = (rawParams.values as IDataObject[] | undefined) ?? [];
	const params: Record<string, unknown> = {};

	for (const entry of values) {
		const key = typeof entry.key === 'string' ? entry.key.trim() : '';
		if (!key) {
			continue;
		}

		params[key] = entry.value;
	}

	return params;
}
