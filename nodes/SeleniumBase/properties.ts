/**
 * Node property definitions for SeleniumBase node
 *
 * Uses INodeProperties interface from n8n-workflow
 * @see https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/
 */

import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_POLLING_INTERVAL, DEFAULT_TIMEOUT } from './constants';

/**
 * Default Python code template for the Execute Script operation
 */
export const DEFAULT_PYTHON_CODE = `from seleniumbase import SB

with SB(headless=True) as sb:
    sb.open("https://example.com")
    sb.save_screenshot_to_logs()
    print("Title:", sb.get_page_title())
`;

/**
 * Operation selector property
 */
export const operationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Execute Script',
			value: 'executeScript',
			description: 'Submit and execute a Python scraping script',
			action: 'Execute a python scraping script',
		},
		{
			name: 'Get Job Status',
			value: 'getStatus',
			description: 'Get the status of an existing job',
			action: 'Get the status of an existing job',
		},
		{
			name: 'Get Job Result',
			value: 'getResult',
			description: 'Get the full result of a completed job',
			action: 'Get the full result of a completed job',
		},
	],
	default: 'executeScript',
};

/**
 * Properties for Execute Script operation
 */
export const executeScriptProperties: INodeProperties[] = [
	{
		displayName: 'Python Code',
		name: 'pythonCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'python',
			alwaysOpenEditWindow: false,
		},
		default: DEFAULT_PYTHON_CODE,
		noDataExpression: true,
		description:
			'Python script to execute using SeleniumBase. Files saved to the working directory become artifacts.',
		displayOptions: {
			show: {
				operation: ['executeScript'],
			},
		},
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description: 'Whether to wait for the job to complete before returning results',
		displayOptions: {
			show: {
				operation: ['executeScript'],
			},
		},
	},
	{
		displayName: 'Polling Interval (Seconds)',
		name: 'pollingInterval',
		type: 'number',
		default: DEFAULT_POLLING_INTERVAL,
		description: 'How often to check the job status in seconds',
		displayOptions: {
			show: {
				operation: ['executeScript'],
				waitForCompletion: [true],
			},
		},
	},
	{
		displayName: 'Timeout (Seconds)',
		name: 'timeout',
		type: 'number',
		default: DEFAULT_TIMEOUT,
		description: 'Maximum time to wait for job completion in seconds',
		displayOptions: {
			show: {
				operation: ['executeScript'],
				waitForCompletion: [true],
			},
		},
	},
	{
		displayName: 'Enable Consistent Session',
		name: 'enableConsistentSession',
		type: 'boolean',
		default: false,
		description:
			'Whether to use a consistent job ID across runs. When enabled, provide a Session Job ID to maintain data consistency between executions.',
		displayOptions: {
			show: {
				operation: ['executeScript'],
			},
		},
	},
	{
		displayName: 'Session Job ID',
		name: 'sessionJobId',
		type: 'string',
		default: '',
		placeholder: 'e.g., {{ $json.job_id }}',
		description:
			'The job ID to use for this session. Leave empty on first run to generate a new ID, then use the returned job_id for subsequent runs. Tip: Use an expression like {{ $json.job_id }} to reference a previous result.',
		displayOptions: {
			show: {
				operation: ['executeScript'],
				enableConsistentSession: [true],
			},
		},
	},
];

/**
 * Properties shared between operations
 */
export const sharedProperties: INodeProperties[] = [
	{
		displayName: 'Download Artifacts',
		name: 'downloadArtifacts',
		type: 'boolean',
		default: true,
		description:
			'Whether to download artifact files as binary data. When enabled, artifacts (screenshots, files) are returned as binary output.',
		displayOptions: {
			show: {
				operation: ['executeScript', 'getResult'],
			},
		},
	},
	{
		displayName: 'Clean Job After Execution',
		name: 'cleanJobAfterExecution',
		type: 'boolean',
		default: true,
		description:
			'Whether to clean up the job and its artifacts on the server after retrieving results. Disable this to keep the job data for later retrieval.',
		displayOptions: {
			show: {
				operation: ['executeScript', 'getResult'],
			},
		},
	},
];

/**
 * Properties for Get Status and Get Result operations
 */
export const jobIdProperty: INodeProperties = {
	displayName: 'Job ID',
	name: 'jobId',
	type: 'string',
	default: '',
	required: true,
	description: 'The ID of the job to check',
	displayOptions: {
		show: {
			operation: ['getStatus', 'getResult'],
		},
	},
};

/**
 * All node properties combined in order
 */
export const seleniumBaseProperties: INodeProperties[] = [
	operationProperty,
	...executeScriptProperties,
	...sharedProperties,
	jobIdProperty,
];
