"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeleniumBase = void 0;
const n8n_workflow_1 = require("n8n-workflow");
async function sleep(ms) {
    await new Promise((resolve) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            resolve();
        }, ms);
    });
}
async function submitJob(context, baseUrl, pythonCode) {
    const boundary = '----n8nFormBoundary' + Math.random().toString(36).substring(2);
    const filename = 'script.py';
    const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="file"; filename="${filename}"`,
        'Content-Type: text/x-python',
        '',
        pythonCode,
        `--${boundary}--`,
        '',
    ].join('\r\n');
    const response = await context.helpers.httpRequest({
        method: 'POST',
        url: `${baseUrl}/submit`,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
    });
    return response;
}
async function getJobStatus(context, baseUrl, jobId) {
    const response = await context.helpers.httpRequest({
        method: 'GET',
        url: `${baseUrl}/status/${jobId}`,
    });
    return response;
}
async function getJobResult(context, baseUrl, jobId) {
    const response = await context.helpers.httpRequest({
        method: 'GET',
        url: `${baseUrl}/result/${jobId}`,
    });
    return response;
}
class SeleniumBase {
    constructor() {
        this.description = {
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
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            usableAsTool: true,
            credentials: [
                {
                    name: 'seleniumBaseApi',
                    required: true,
                },
            ],
            properties: [
                {
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
                },
                {
                    displayName: 'Python Code',
                    name: 'pythonCode',
                    type: 'string',
                    typeOptions: {
                        editor: 'codeNodeEditor',
                        editorLanguage: 'python',
                        alwaysOpenEditWindow: false,
                    },
                    default: `from seleniumbase import SB

with SB(headless=True) as sb:
    sb.open("https://example.com")
    sb.save_screenshot_to_logs()
    print("Title:", sb.get_page_title())
`,
                    noDataExpression: true,
                    description: 'Python script to execute using SeleniumBase. Files saved to the working directory become artifacts.',
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
                    default: 5,
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
                    default: 600,
                    description: 'Maximum time to wait for job completion in seconds',
                    displayOptions: {
                        show: {
                            operation: ['executeScript'],
                            waitForCompletion: [true],
                        },
                    },
                },
                {
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
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('seleniumBaseApi');
        const baseUrl = credentials.baseUrl.replace(/\/$/, '');
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                if (operation === 'executeScript') {
                    const pythonCode = this.getNodeParameter('pythonCode', itemIndex);
                    const waitForCompletion = this.getNodeParameter('waitForCompletion', itemIndex);
                    const pollingInterval = this.getNodeParameter('pollingInterval', itemIndex, 5);
                    const timeout = this.getNodeParameter('timeout', itemIndex, 600);
                    const submitResponse = await submitJob(this, baseUrl, pythonCode);
                    if (!waitForCompletion) {
                        returnData.push({
                            json: submitResponse,
                            pairedItem: itemIndex,
                        });
                        continue;
                    }
                    const startTime = Date.now();
                    const timeoutMs = timeout * 1000;
                    let status = submitResponse.status;
                    const jobId = submitResponse.job_id;
                    while (status === 'pending' || status === 'running') {
                        if (Date.now() - startTime > timeoutMs) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Job timed out after ${timeout} seconds`, { itemIndex });
                        }
                        await sleep(pollingInterval * 1000);
                        const statusResponse = await getJobStatus(this, baseUrl, jobId);
                        status = statusResponse.status;
                    }
                    const result = await getJobResult(this, baseUrl, jobId);
                    returnData.push({
                        json: result,
                        pairedItem: itemIndex,
                    });
                }
                else if (operation === 'getStatus') {
                    const jobId = this.getNodeParameter('jobId', itemIndex);
                    const statusResponse = await getJobStatus(this, baseUrl, jobId);
                    returnData.push({
                        json: statusResponse,
                        pairedItem: itemIndex,
                    });
                }
                else if (operation === 'getResult') {
                    const jobId = this.getNodeParameter('jobId', itemIndex);
                    const result = await getJobResult(this, baseUrl, jobId);
                    returnData.push({
                        json: result,
                        pairedItem: itemIndex,
                    });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: itemIndex,
                    });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
            }
        }
        return [returnData];
    }
}
exports.SeleniumBase = SeleniumBase;
//# sourceMappingURL=SeleniumBase.node.js.map