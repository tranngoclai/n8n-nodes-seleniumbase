import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class SeleniumBaseApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    icon: "file:seleniumbase.svg";
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
