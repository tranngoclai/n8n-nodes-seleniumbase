import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Validates that a required string parameter is present.
 */
export function validateRequiredString(
	value: string,
	paramName: string,
	node: INode,
	itemIndex?: number,
): void {
	if (value && value.trim() !== '') {
		return;
	}

	throw new NodeOperationError(node, `${paramName} cannot be empty`, {
		itemIndex,
	});
}

/**
 * Converts unknown errors into a message string.
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'string' && error.trim() !== '') {
		return error;
	}

	return 'Unknown error';
}

/**
 * Runs cleanup logic without masking the primary error.
 */
export async function cleanupWithoutMaskingPrimaryError(
	cleanupFn: () => Promise<void>,
): Promise<string | undefined> {
	try {
		await cleanupFn();
		return undefined;
	} catch (error) {
		return getErrorMessage(error);
	}
}
