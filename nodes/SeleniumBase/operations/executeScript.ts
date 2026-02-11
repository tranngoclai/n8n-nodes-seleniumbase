import type { IBinaryData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { DEFAULT_POLLING_INTERVAL, DEFAULT_TIMEOUT } from '../constants';
import {
	cleanupWithoutMaskingPrimaryError,
	validateRequiredString,
} from '../helpers/errors';
import {
	getBooleanOptionParameter,
	getNumberOptionParameter,
} from '../helpers/options';
import { buildParamsObject } from '../helpers/params';
import type { SeleniumBaseOperationHandler } from './types';

export const executeScriptOperation: SeleniumBaseOperationHandler = async ({
	context,
	apiClient,
	itemIndex,
	inputItem,
}) => {
	const pythonCode = context.getNodeParameter('pythonCode', itemIndex) as string;
	const cleanJobAfterExecution = getBooleanOptionParameter(
		context,
		itemIndex,
		'cleanJobAfterExecution',
		'cleanJobAfterExecution',
		true,
	);
	const downloadArtifacts = getBooleanOptionParameter(
		context,
		itemIndex,
		'downloadArtifacts',
		'downloadArtifacts',
		true,
	);
	const maintainSessionConsistency = getBooleanOptionParameter(
		context,
		itemIndex,
		'maintainSessionConsistency',
		'maintainSessionConsistency',
		false,
	);
	const rawParams = context.getNodeParameter('options.params', itemIndex, {
		values: [],
	}) as IDataObject;
	const params = buildParamsObject(rawParams);
	const inputBinaryProperty = (context.getNodeParameter(
		'options.inputBinaryProperty',
		itemIndex,
		'',
	) as string).trim();
	const waitForCompletion = getBooleanOptionParameter(
		context,
		itemIndex,
		'waitForCompletion',
		'waitForCompletion',
		true,
	);

	validateRequiredString(pythonCode, 'Python Code', context.getNode(), itemIndex);

	const profileName = maintainSessionConsistency
		? context.getNode().name.replace(/[^a-zA-Z0-9_-]/g, '_')
		: undefined;

	let attachmentId: string | undefined;
	if (inputBinaryProperty) {
		const binaryData = inputItem.binary?.[inputBinaryProperty];
		if (!binaryData) {
			throw new NodeOperationError(
				context.getNode(),
				`Attachment Name "${inputBinaryProperty}" not found on input item`,
				{ itemIndex },
			);
		}

		const fileBuffer = await context.helpers.getBinaryDataBuffer(itemIndex, inputBinaryProperty);
		const fileName = binaryData.fileName || `${inputBinaryProperty}.bin`;
		const mimeType = binaryData.mimeType || 'application/octet-stream';
		const uploadedAttachment = await apiClient.uploadAttachment(
			fileBuffer,
			fileName,
			mimeType,
			itemIndex,
		);

		const uploadedAttachmentId = uploadedAttachment.attachment_id?.trim();
		if (!uploadedAttachmentId) {
			throw new NodeOperationError(
				context.getNode(),
				'Attachment upload succeeded but no attachment_id was returned',
				{ itemIndex },
			);
		}

		attachmentId = uploadedAttachmentId;
	}

	const submitResponse = await apiClient.submitJob(
		pythonCode,
		profileName,
		attachmentId,
		params,
		itemIndex,
	);

	if (!waitForCompletion) {
		return {
			json: submitResponse as unknown as IDataObject,
			pairedItem: itemIndex,
		};
	}

	const pollingInterval = getNumberOptionParameter(
		context,
		itemIndex,
		'pollingInterval',
		'pollingInterval',
		DEFAULT_POLLING_INTERVAL,
	);
	const timeout = getNumberOptionParameter(
		context,
		itemIndex,
		'timeout',
		'timeout',
		DEFAULT_TIMEOUT,
	);

	await apiClient.waitForJobCompletion(
		submitResponse.job_id,
		submitResponse.status,
		pollingInterval,
		timeout,
		itemIndex,
	);

	const result = await apiClient.getJobResult(submitResponse.job_id, itemIndex);
	if (typeof result.status === 'string' && result.status.toLowerCase() === 'failed') {
		let cleanupErrorMessage: string | undefined;
		if (cleanJobAfterExecution) {
			cleanupErrorMessage = await cleanupWithoutMaskingPrimaryError(async () => {
				await apiClient.cleanupJob(submitResponse.job_id, itemIndex);
			});
		}

		const apiError = typeof result.error === 'string' ? result.error.trim() : '';
		const stderr = typeof result.logs?.stderr === 'string' ? result.logs.stderr.trim() : '';
		const cleanupError = cleanupErrorMessage ? `Cleanup also failed: ${cleanupErrorMessage}` : '';
		const failureDetails = [apiError, stderr, cleanupError].filter((value) => value !== '').join('\n\n');

		throw new NodeOperationError(
			context.getNode(),
			failureDetails
				? `Job ${submitResponse.job_id} failed:\n\n${failureDetails}`
				: `Job ${submitResponse.job_id} failed.`,
			{ itemIndex },
		);
	}

	let binaryData: Record<string, IBinaryData> | undefined;
	if (downloadArtifacts) {
		const artifacts = await apiClient.downloadAllArtifacts(submitResponse.job_id, result, itemIndex);
		binaryData = Object.keys(artifacts).length > 0 ? artifacts : undefined;
	}

	if (cleanJobAfterExecution) {
		await apiClient.cleanupJob(submitResponse.job_id, itemIndex);
	}

	return {
		json: result as unknown as IDataObject,
		binary: binaryData,
		pairedItem: itemIndex,
	};
};
