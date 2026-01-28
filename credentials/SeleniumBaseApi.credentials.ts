import type {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class SeleniumBaseApi implements ICredentialType {
    name = 'seleniumBaseApi';
    displayName = 'SeleniumBase API';
    documentationUrl = 'https://seleniumbase.io/';
    icon = 'file:seleniumbase.svg' as const;
    properties: INodeProperties[] = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'http://localhost:8000',
            placeholder: 'http://localhost:8000',
            description: 'The base URL of the SeleniumBase API server',
            required: true,
        },
    ];

    // No authentication required for now, but the credential structure is ready for future use
    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {},
    };

    // Test credential by calling the health endpoint
    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '/health',
            method: 'GET',
        },
    };
}
