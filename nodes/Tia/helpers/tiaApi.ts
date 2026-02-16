import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export interface TiaCredentials {
	baseUrl: string;
	apiKey: string;
	username: string;
	password: string;
}

export interface TiaTokenResponse {
	token: string;
	username: string;
	isEmployee: boolean;
	hasActivePayroll: boolean;
	expiresOn: string;
	scheme: string;
}

/**
 * Token cache to store tokens per credential set
 * Key format: `${baseUrl}:${username}`
 */
const tokenCache = new Map<string, { token: string; expiresOn: Date }>();

/**
 * Get authentication token from TIA API
 * Implements token caching to avoid unnecessary API calls
 */
export async function getTiaToken(
	this: IExecuteFunctions,
	credentials: TiaCredentials,
): Promise<string> {
	const cacheKey = `${credentials.baseUrl}:${credentials.username}`;
	const cached = tokenCache.get(cacheKey);

	// Check if cached token is still valid (with 5 minute buffer)
	if (cached && cached.expiresOn > new Date(Date.now() + 5 * 60 * 1000)) {
		return cached.token;
	}

	// Request new token
	// Trim credentials to remove any accidental whitespace
	const trimmedUsername = credentials.username?.trim() || credentials.username;
	const trimmedApiKey = credentials.apiKey?.trim() || credentials.apiKey;

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${credentials.baseUrl}/v1/Token`,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'X-apikey': trimmedApiKey,
		},
		body: {
			username: trimmedUsername,
			password: credentials.password, // Don't trim password - might be intentional
		},
		json: true,
	};

	try {
		const tokenData = (await this.helpers.httpRequest(options)) as TiaTokenResponse;

		// Cache the token
		tokenCache.set(cacheKey, {
			token: tokenData.token,
			expiresOn: new Date(tokenData.expiresOn),
		});

		return tokenData.token;
	} catch (error) {
		// Enhanced error logging to help debug authentication issues
		const errorMessage = error.message || 'Unknown error';
		const statusCode = error.statusCode || error.status || 'No status code';
		let responseBody = 'No response data';

		// Try to extract response body safely
		if (error.response?.body) {
			try {
				responseBody = typeof error.response.body === 'string'
					? error.response.body
					: JSON.stringify(error.response.body);
			} catch {
				responseBody = 'Unable to parse response';
			}
		}

		throw new NodeApiError(this.getNode(), error, {
			message: 'Failed to authenticate with TIA API',
			description: `Status Code: ${statusCode}\nError: ${errorMessage}\nResponse: ${responseBody}\n\nPlease verify:\n- Base URL: ${credentials.baseUrl}\n- API Key is correct\n- Username is correct\n- Password is correct (special characters like " must work)\n\nRequest sent to: ${credentials.baseUrl}/v1/Token`,
		});
	}
}

/**
 * Make an authenticated request to TIA API
 * Automatically handles token retrieval and authentication
 */
export async function tiaApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('tiaApi');
	const { baseUrl, apiKey, username } = credentials as unknown as TiaCredentials;

	// Get authentication token
	const token = await getTiaToken.call(this, credentials as unknown as TiaCredentials);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			'X-apikey': apiKey,
			Authorization: `Access_token ${token}`,
		},
		json: true,
	};

	if (body) {
		options.body = body;
	}

	if (qs) {
		options.qs = qs;
	}

	try {
		const response = await this.helpers.httpRequest(options);
		return response as IDataObject | IDataObject[];
	} catch (error) {
		// If token expired, clear cache and retry once
		if (error.statusCode === 401) {
			const cacheKey = `${baseUrl}:${username}`;
			tokenCache.delete(cacheKey);

			// Retry with fresh token
			const newToken = await getTiaToken.call(
				this,
				credentials as unknown as TiaCredentials,
			);
			options.headers!.Authorization = `Access_token ${newToken}`;

			try {
				const retryResponse = await this.helpers.httpRequest(options);
				return retryResponse as IDataObject | IDataObject[];
			} catch (retryError) {
				throw new NodeApiError(this.getNode(), retryError, {
					message: 'TIA API request failed after token refresh',
				});
			}
		}

		// Extract error details for better debugging
		const errorMessage = error.message || 'Unknown error';
		const statusCode = error.statusCode || error.status || 'No status code';
		let responseBody = 'No response data';

		if (error.response?.body) {
			try {
				responseBody = typeof error.response.body === 'string'
					? error.response.body
					: JSON.stringify(error.response.body);
			} catch {
				responseBody = 'Unable to parse response';
			}
		}

		throw new NodeApiError(this.getNode(), error, {
			message: `TIA API request failed: ${method} ${endpoint}`,
			description: `Status: ${statusCode}\nError: ${errorMessage}\nResponse: ${responseBody}`,
		});
	}
}

/**
 * Make an authenticated request to TIA API with automatic pagination
 * Useful for endpoints that return large datasets
 */
export async function tiaApiRequestAllItems(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let response: IDataObject | IDataObject[];
	let hasMore = true;

	const queryString = qs || {};
	queryString.limit = queryString.limit || 100;
	queryString.offset = queryString.offset || 0;

	while (hasMore) {
		response = await tiaApiRequest.call(this, method, endpoint, body, queryString);

		if (Array.isArray(response)) {
			returnData.push(...response);
			if (response.length < (queryString.limit as number)) {
				hasMore = false;
			} else {
				queryString.offset = (queryString.offset as number) + (queryString.limit as number);
			}
		} else if (
			response.data &&
			Array.isArray((response as IDataObject).data)
		) {
			const dataArray = (response as IDataObject).data as IDataObject[];
			returnData.push(...dataArray);
			if (dataArray.length < (queryString.limit as number)) {
				hasMore = false;
			} else {
				queryString.offset = (queryString.offset as number) + (queryString.limit as number);
			}
		} else {
			returnData.push(response as IDataObject);
			hasMore = false;
		}
	}

	return returnData;
}
