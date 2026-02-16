import type { ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';

export class TiaApi implements ICredentialType {
	name = 'tiaApi';
	displayName = 'TIA API';

	documentationUrl = 'https://api.staging.tia.cronos.be/scalar/v1';

	icon = { light: 'file:tia.svg', dark: 'file:tia.dark.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.staging.tia.cronos.be',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	/**
	 * Test credentials by requesting an access token.
	 * If this succeeds, apiKey + username/password are valid.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/Token',
			method: 'POST',
			headers: {
				'X-apikey': '={{$credentials.apiKey}}',
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
			json: true,
		},
	};
}
