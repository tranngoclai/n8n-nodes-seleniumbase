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
			name: 'Clean Up Job',
			value: 'cleanupJob',
			description: 'Clean up a job and its artifacts',
			action: 'Clean up a job',
		},
		{
			name: 'Clean Up Profile',
			value: 'cleanupProfile',
			description: 'Clean up a browser profile',
			action: 'Clean up a browser profile',
		},
		{
			name: 'Execute Script',
			value: 'executeScript',
			description: 'Submit and execute a Python scraping script',
			action: 'Execute a python scraping script',
		},
		{
			name: 'Get Job Result',
			value: 'getResult',
			description: 'Get the full result of a completed job',
			action: 'Get the full result of a completed job',
		},
		{
			name: 'Get Job Status',
			value: 'getStatus',
			description: 'Get the status of an existing job',
			action: 'Get the status of an existing job',
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
		displayName: 'Maintain Session Consistency',
		name: 'maintainSessionConsistency',
		type: 'boolean',
		default: false,
		description:
			'Whether to maintain cookies, sessions, and browser state across executions. When enabled, a persistent profile is automatically created using the node name as the profile ID.',
		displayOptions: {
			show: {
				operation: ['executeScript'],
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
	displayName: 'Job Name or ID',
	name: 'jobId',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getJobs',
	},
	default: '',
	required: true,
	description: 'The ID of the job to check. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	displayOptions: {
		show: {
			operation: ['getStatus', 'getResult', 'cleanupJob'],
		},
	},
};

/**
 * Property for Clean Up Profile operation
 */
export const profileNameProperty: INodeProperties = {
	displayName: 'Profile Name or ID',
	name: 'profileName',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getProfiles',
	},
	default: '',
	required: true,
	description: 'The name of the profile to clean up. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	displayOptions: {
		show: {
			operation: ['cleanupProfile'],
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
	profileNameProperty,
];
