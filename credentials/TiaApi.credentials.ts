import type { ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';

/**
 * TIA API Credentials
 *
 * Defines the credential fields required for authenticating with the TIA API.
 * The TIA API uses a two-step authentication process:
 * 1. Exchange API key + username/password for a temporary access token
 * 2. Use the access token in subsequent API requests
 *
 * Important: If your API key or password contains special characters (like quotes),
 * use "Expression" mode in n8n instead of "Fixed" mode to ensure proper storage.
 * Alternative and cleaner: create a .env file in the directory where you start your n8n. So if you use npm run dev and your n8n automatically starts with npm run dev, save your .env in the project root. 
 * If you just start n8n on your pc, save your .env file from where your n8n starts, mostly here: ~/.n8n/ 
 */
export class TiaApi implements ICredentialType {
	name = 'tiaApi';
	displayName = 'TIA API';

	// Link to TIA API documentation
	documentationUrl = 'https://api.staging.tia.cronos.be/scalar/v1';

	// Custom icons for light and dark themes
	icon = { light: 'file:tia.svg', dark: 'file:tia.dark.svg' } as const;

	// Credential fields shown to users in n8n
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.staging.tia.cronos.be',
			required: true,
			// TIP: Change to production URL when deploying: https://api.tia.cronos.be
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true }, // Masked in UI for security
			default: '',
			required: true,
			// Used in X-apikey header for all API requests
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			// TIA username for token authentication
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true }, // Masked in UI for security
			default: '',
			required: true,
			// NOTE: If password contains special characters, use Expression mode in n8n
		},
	];

	/**
	 * Credential Test Configuration
	 *
	 * When users click "Save" in n8n's credential modal, this request is executed
	 * to verify that all credentials are valid. It attempts to get an access token
	 * from the TIA API using the provided credentials.
	 *
	 * If successful: All credentials are valid and the connection works
	 * If failed: Either credentials are wrong or API is unreachable
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}', // Uses credential value
			url: '/v1/Token', // TIA token endpoint
			method: 'POST',
			headers: {
				'X-apikey': '={{$credentials.apiKey}}', // API key in custom header
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
			json: true, // Automatically parse JSON response
		},
	};
}
