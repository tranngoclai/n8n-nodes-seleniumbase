import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IDataObject,
    IBinaryData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Constants
const DEFAULT_POLLING_INTERVAL = 5;
const DEFAULT_TIMEOUT = 600;
const MILLISECONDS_PER_SECOND = 1000;
const JOB_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

// Interfaces
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

/**
 * Pauses execution for the specified duration
 * @param ms - Duration to sleep in milliseconds
 */
async function sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Validates that a string parameter is not empty
 * @param value - The value to validate
 * @param paramName - The name of the parameter for error messages
 * @throws NodeOperationError if the value is empty
 */
function validateRequiredString(value: string, paramName: string, node: ReturnType<IExecuteFunctions['getNode']>): void {
    if (!value || value.trim() === '') {
        throw new NodeOperationError(node, `${paramName} cannot be empty`);
    }
}

/**
 * Submits a Python script as a job to the SeleniumBase API
 * @param context - The n8n execution context
 * @param baseUrl - The base URL of the SeleniumBase API
 * @param pythonCode - The Python code to execute
 * @returns The submit response containing job_id and status
 */
async function submitJob(
    context: IExecuteFunctions,
    baseUrl: string,
    pythonCode: string,
): Promise<SubmitResponse> {
    const boundary = `----n8nFormBoundary${Math.random().toString(36).substring(2)}`;
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

    try {
        const response = await context.helpers.httpRequest({
            method: 'POST',
            url: `${baseUrl}/submit`,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body,
        });

        return response as SubmitResponse;
    } catch (error) {
        throw new NodeOperationError(
            context.getNode(),
            `Failed to submit job: ${(error as Error).message}`,
        );
    }
}

/**
 * Retrieves the current status of a job
 * @param context - The n8n execution context
 * @param baseUrl - The base URL of the SeleniumBase API
 * @param jobId - The ID of the job to check
 * @returns The status response
 */
async function getJobStatus(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
): Promise<StatusResponse> {
    try {
        const response = await context.helpers.httpRequest({
            method: 'GET',
            url: `${baseUrl}/status/${jobId}`,
        });

        return response as StatusResponse;
    } catch (error) {
        throw new NodeOperationError(
            context.getNode(),
            `Failed to get job status for job ${jobId}: ${(error as Error).message}`,
        );
    }
}

/**
 * Retrieves the complete result of a job
 * @param context - The n8n execution context
 * @param baseUrl - The base URL of the SeleniumBase API
 * @param jobId - The ID of the job
 * @returns The job result including artifacts and logs
 */
async function getJobResult(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
): Promise<JobResult> {
    try {
        const response = await context.helpers.httpRequest({
            method: 'GET',
            url: `${baseUrl}/result/${jobId}`,
        });

        return response as JobResult;
    } catch (error) {
        throw new NodeOperationError(
            context.getNode(),
            `Failed to get job result for job ${jobId}: ${(error as Error).message}`,
        );
    }
}

/**
 * Downloads a job artifact as binary data
 * @param context - The n8n execution context
 * @param baseUrl - The base URL of the SeleniumBase API
 * @param jobId - The ID of the job
 * @param artifact - The artifact information
 * @returns Binary data for the artifact
 */
async function downloadArtifact(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
    artifact: ArtifactInfo,
): Promise<IBinaryData> {
    try {
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
    } catch (error) {
        throw new NodeOperationError(
            context.getNode(),
            `Failed to download artifact ${artifact.filename}: ${(error as Error).message}`,
        );
    }
}

/**
 * Downloads all artifacts from a job result as binary data
 * @param context - The n8n execution context
 * @param baseUrl - The base URL of the SeleniumBase API
 * @param jobId - The ID of the job
 * @param result - The job result containing artifacts
 * @returns Object mapping filenames to binary data
 */
async function downloadAllArtifacts(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
    result: JobResult,
): Promise<{ [key: string]: IBinaryData }> {
    const binaryData: { [key: string]: IBinaryData } = {};

    if (!result.artifacts || result.artifacts.length === 0) {
        return binaryData;
    }

    for (const artifact of result.artifacts) {
        // Use filename as binary key
        binaryData[artifact.filename] = await downloadArtifact(
            context,
            baseUrl,
            jobId,
            artifact,
        );
    }

    return binaryData;
}

/**
 * Waits for a job to complete by polling its status
 * @param context - The n8n execution context
 * @param baseUrl - The base URL of the SeleniumBase API
 * @param jobId - The ID of the job
 * @param initialStatus - The initial status of the job
 * @param pollingInterval - Interval in seconds between status checks
 * @param timeout - Maximum time to wait in seconds
 * @param itemIndex - The item index for error reporting
 */
async function waitForJobCompletion(
    context: IExecuteFunctions,
    baseUrl: string,
    jobId: string,
    initialStatus: string,
    pollingInterval: number,
    timeout: number,
    itemIndex: number,
): Promise<void> {
    const startTime = Date.now();
    const timeoutMs = timeout * MILLISECONDS_PER_SECOND;
    let status = initialStatus;

    while (status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING) {
        const elapsedTime = Date.now() - startTime;

        if (elapsedTime > timeoutMs) {
            throw new NodeOperationError(
                context.getNode(),
                `Job ${jobId} timed out after ${timeout} seconds`,
                { itemIndex },
            );
        }

        await sleep(pollingInterval * MILLISECONDS_PER_SECOND);

        const statusResponse = await getJobStatus(context, baseUrl, jobId);
        status = statusResponse.status;
    }

    // Check if job failed
    if (status === JOB_STATUS.FAILED) {
        throw new NodeOperationError(
            context.getNode(),
            `Job ${jobId} failed. Check the job result for error details.`,
            { itemIndex },
        );
    }
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
                    const waitForCompletion = this.getNodeParameter('waitForCompletion', itemIndex) as boolean;

                    // Validate Python code
                    validateRequiredString(pythonCode, 'Python Code', this.getNode());

                    // Submit the job
                    const submitResponse = await submitJob(this, baseUrl, pythonCode);

                    if (!waitForCompletion) {
                        returnData.push({
                            json: submitResponse as unknown as IDataObject,
                            pairedItem: itemIndex,
                        });
                        continue;
                    }

                    // Wait for job completion
                    const pollingInterval = this.getNodeParameter(
                        'pollingInterval',
                        itemIndex,
                        DEFAULT_POLLING_INTERVAL,
                    ) as number;
                    const timeout = this.getNodeParameter(
                        'timeout',
                        itemIndex,
                        DEFAULT_TIMEOUT,
                    ) as number;

                    await waitForJobCompletion(
                        this,
                        baseUrl,
                        submitResponse.job_id,
                        submitResponse.status,
                        pollingInterval,
                        timeout,
                        itemIndex,
                    );

                    // Get full result
                    const result = await getJobResult(this, baseUrl, submitResponse.job_id);
                    const downloadArtifacts = this.getNodeParameter(
                        'downloadArtifacts',
                        itemIndex,
                        true,
                    ) as boolean;

                    let binaryData: { [key: string]: IBinaryData } | undefined;
                    if (downloadArtifacts) {
                        const artifacts = await downloadAllArtifacts(this, baseUrl, submitResponse.job_id, result);
                        binaryData = Object.keys(artifacts).length > 0 ? artifacts : undefined;
                    }

                    returnData.push({
                        json: result as unknown as IDataObject,
                        binary: binaryData,
                        pairedItem: itemIndex,
                    });
                } else if (operation === 'getStatus') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;

                    validateRequiredString(jobId, 'Job ID', this.getNode());

                    const statusResponse = await getJobStatus(this, baseUrl, jobId);

                    returnData.push({
                        json: statusResponse as unknown as IDataObject,
                        pairedItem: itemIndex,
                    });
                } else if (operation === 'getResult') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;

                    validateRequiredString(jobId, 'Job ID', this.getNode());

                    const result = await getJobResult(this, baseUrl, jobId);
                    const downloadArtifacts = this.getNodeParameter(
                        'downloadArtifacts',
                        itemIndex,
                        true,
                    ) as boolean;

                    let binaryData: { [key: string]: IBinaryData } | undefined;
                    if (downloadArtifacts) {
                        const artifacts = await downloadAllArtifacts(this, baseUrl, jobId, result);
                        binaryData = Object.keys(artifacts).length > 0 ? artifacts : undefined;
                    }

                    returnData.push({
                        json: result as unknown as IDataObject,
                        binary: binaryData,
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
                throw error;
            }
        }

        return [returnData];
    }
}
