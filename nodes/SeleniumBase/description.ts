/**
 * Node type description for SeleniumBase node
 *
 * Uses INodeTypeDescription interface from n8n-workflow
 * @see https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/
 */

import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { seleniumBaseProperties } from './properties';

/**
 * SeleniumBase node type description
 *
 * Defines metadata, credentials, inputs/outputs, and properties for the node
 */
export const seleniumBaseDescription: INodeTypeDescription = {
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
