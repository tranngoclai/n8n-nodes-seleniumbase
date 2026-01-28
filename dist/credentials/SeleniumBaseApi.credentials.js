"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeleniumBaseApi = void 0;
class SeleniumBaseApi {
    constructor() {
        this.name = 'seleniumBaseApi';
        this.displayName = 'SeleniumBase API';
        this.documentationUrl = 'https://seleniumbase.io/';
        this.icon = 'file:seleniumbase.svg';
        this.properties = [
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
        this.authenticate = {
            type: 'generic',
            properties: {},
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/health',
                method: 'GET',
            },
        };
    }
}
exports.SeleniumBaseApi = SeleniumBaseApi;
//# sourceMappingURL=SeleniumBaseApi.credentials.js.map