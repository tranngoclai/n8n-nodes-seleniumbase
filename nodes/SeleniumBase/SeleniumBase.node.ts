import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IDataObject,
    IBinaryData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

interface ArtifactInfo {
    filename: string;
    path: string;
    type: string;
    size: number;
}

interface JobResult {
    job_id: string;
    status: string;
    artifacts: ArtifactInfo[];
    logs: {
        stdout: string;
        stderr: string;
    };
    error?: string;
    started_at?: string;
    completed_at?: string;
}

interface SubmitResponse {
    job_id: string;
    status: string;
    message: string;
}

interface StatusResponse {
    job_id: string;
    status: string;
    started_at?: string;
    completed_at?: string;
}

// Helper function to pause execution
async function sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            resolve();
        }, ms);
    });
}

// Helper function to submit a job
async function submitJob(
    context: IExecuteFunctions,
    baseUrl: string,
    pythonCode: string,
): Promise<SubmitResponse> {
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

    return response as SubmitResponse;
}

// Helper function to get job status
async function getJobStatus(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
): Promise<StatusResponse> {
    const response = await context.helpers.httpRequest({
        method: 'GET',
        url: `${baseUrl}/status/${jobId}`,
    });

    return response as StatusResponse;
}

// Helper function to get job result
async function getJobResult(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
): Promise<JobResult> {
    const response = await context.helpers.httpRequest({
        method: 'GET',
        url: `${baseUrl}/result/${jobId}`,
    });

    return response as JobResult;
}

// Helper function to download an artifact as binary
async function downloadArtifact(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
    artifact: ArtifactInfo,
): Promise<IBinaryData> {
    const response = await context.helpers.httpRequest({
        method: 'GET',
        url: `${baseUrl}/artifacts/${jobId}/${artifact.filename}`,
        encoding: 'arraybuffer',
        returnFullResponse: true,
    });

    const buffer = Buffer.from(response.body as ArrayBuffer);

    return await context.helpers.prepareBinaryData(
        buffer,
        artifact.filename,
        artifact.type,
    );
}

export class SeleniumBase implements INodeType {
    description: INodeTypeDescription = {
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
            // Execute Script properties
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
                displayName: 'Download Artifacts',
                name: 'downloadArtifacts',
                type: 'boolean',
                default: true,
                description: 'Whether to download artifact files as binary data. When enabled, artifacts (screenshots, files) are returned as binary output.',
                displayOptions: {
                    show: {
                        operation: ['executeScript', 'getResult'],
                    },
                },
            },
            // Get Status / Get Result properties
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

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = await this.getCredentials('seleniumBaseApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const operation = this.getNodeParameter('operation', itemIndex) as string;

                if (operation === 'executeScript') {
                    const pythonCode = this.getNodeParameter('pythonCode', itemIndex) as string;
                    const waitForCompletion = this.getNodeParameter(
                        'waitForCompletion',
                        itemIndex,
                    ) as boolean;
                    const pollingInterval = this.getNodeParameter(
                        'pollingInterval',
                        itemIndex,
                        5,
                    ) as number;
                    const timeout = this.getNodeParameter('timeout', itemIndex, 600) as number;

                    // Submit the job
                    const submitResponse = await submitJob(this, baseUrl, pythonCode);

                    if (!waitForCompletion) {
                        // Return immediately with job_id
                        returnData.push({
                            json: submitResponse as unknown as IDataObject,
                            pairedItem: itemIndex,
                        });
                        continue;
                    }

                    // Poll for completion
                    const startTime = Date.now();
                    const timeoutMs = timeout * 1000;
                    let status = submitResponse.status;
                    const jobId = submitResponse.job_id;

                    while (status === 'pending' || status === 'running') {
                        if (Date.now() - startTime > timeoutMs) {
                            throw new NodeOperationError(
                                this.getNode(),
                                `Job timed out after ${timeout} seconds`,
                                { itemIndex },
                            );
                        }

                        // Wait before polling
                        await sleep(pollingInterval * 1000);

                        // Check status
                        const statusResponse = await getJobStatus(this, baseUrl, jobId);
                        status = statusResponse.status;
                    }

                    // Get full result
                    const result = await getJobResult(this, baseUrl, jobId);

                    const downloadArtifacts = this.getNodeParameter(
                        'downloadArtifacts',
                        itemIndex,
                        true,
                    ) as boolean;

                    // Download artifacts as binary if enabled
                    const binaryData: { [key: string]: IBinaryData } = {};
                    if (downloadArtifacts && result.artifacts && result.artifacts.length > 0) {
                        for (const artifact of result.artifacts) {
                            const binaryKey = artifact.filename;
                            binaryData[binaryKey] = await downloadArtifact(
                                this,
                                baseUrl,
                                jobId,
                                artifact,
                            );
                        }
                    }

                    returnData.push({
                        json: result as unknown as IDataObject,
                        binary: Object.keys(binaryData).length > 0 ? binaryData : undefined,
                        pairedItem: itemIndex,
                    });
                } else if (operation === 'getStatus') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;
                    const statusResponse = await getJobStatus(this, baseUrl, jobId);

                    returnData.push({
                        json: statusResponse as unknown as IDataObject,
                        pairedItem: itemIndex,
                    });
                } else if (operation === 'getResult') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;
                    const result = await getJobResult(this, baseUrl, jobId);

                    const downloadArtifacts = this.getNodeParameter(
                        'downloadArtifacts',
                        itemIndex,
                        true,
                    ) as boolean;

                    // Download artifacts as binary if enabled
                    const binaryData: { [key: string]: IBinaryData } = {};
                    if (downloadArtifacts && result.artifacts && result.artifacts.length > 0) {
                        for (const artifact of result.artifacts) {
                            const binaryKey = artifact.filename.replace(/[^a-zA-Z0-9_]/g, '_');
                            binaryData[binaryKey] = await downloadArtifact(
                                this,
                                baseUrl,
                                jobId,
                                artifact,
                            );
                        }
                    }

                    returnData.push({
                        json: result as unknown as IDataObject,
                        binary: Object.keys(binaryData).length > 0 ? binaryData : undefined,
                        pairedItem: itemIndex,
                    });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message },
                        pairedItem: itemIndex,
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
            }
        }

        return [returnData];
    }
}
