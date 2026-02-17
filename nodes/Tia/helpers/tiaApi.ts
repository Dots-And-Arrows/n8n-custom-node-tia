/**
 * TIA API Helper Functions
 *
 * This file contains all the logic for interacting with the TIA API, including:
 * - Token-based authentication with automatic caching
 * - Authenticated API requests with retry logic
 * - Pagination support for large datasets
 *
 * Authentication Flow:
 * 1. Get token from /v1/Token using API key + username/password
 * 2. Cache token to avoid unnecessary authentication requests
 * 3. Use token in Authorization header for all API calls
 * 4. Automatically refresh token if it expires (401 error)
 */

import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// Type definitions for TIA API credentials
export interface TiaCredentials {
	baseUrl: string;
	apiKey: string;
	username: string;
	password: string;
}

// Type definition for TIA token response
export interface TiaTokenResponse {
	token: string;
	username: string;
	isEmployee: boolean;
	hasActivePayroll: boolean;
	expiresOn: string; // ISO 8601 datetime string
	scheme: string;
}

/**
 * In-memory token cache to store tokens per credential set
 *
 * This prevents unnecessary token requests and improves performance.
 * Tokens are cached with their expiration time and automatically
 * invalidated when they expire.
 *
 * Cache key format: `${baseUrl}:${username}`
 * This ensures separate tokens for different users/environments
 */
const tokenCache = new Map<string, { token: string; expiresOn: Date }>();

/**
 * Get Authentication Token from TIA API
 *
 * This function handles the token authentication flow with intelligent caching:
 *
 * 1. Check cache for existing valid token
 *    - If found and not expired (5 min buffer), return cached token
 *    - This avoids unnecessary API calls and improves performance
 *
 * 2. If no valid cached token, request new one from API
 *    - POST to /v1/Token with API key, username, and password
 *    - Cache the new token with its expiration time
 *
 * 3. Return token for use in API requests
 *
 * @param this - n8n execution context
 * @param credentials - TIA API credentials
 * @returns Access token for API authentication
 * @throws NodeApiError if authentication fails
 */
export async function getTiaToken(
	this: IExecuteFunctions,
	credentials: TiaCredentials,
): Promise<string> {
	// Create unique cache key for this credential set
	const cacheKey = `${credentials.baseUrl}:${credentials.username}`;
	const cached = tokenCache.get(cacheKey);

	// Check if we have a valid cached token (with 5 minute safety buffer)
	// The buffer ensures we don't use a token that's about to expire
	if (cached && cached.expiresOn > new Date(Date.now() + 5 * 60 * 1000)) {
		return cached.token;
	}

	// No valid cached token - request a new one from the API
	// Trim whitespace from username and API key to prevent authentication errors
	const trimmedUsername = credentials.username?.trim() || credentials.username;
	const trimmedApiKey = credentials.apiKey?.trim() || credentials.apiKey;

	// Build the token request
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${credentials.baseUrl}/v1/Token`,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'X-apikey': trimmedApiKey, // TIA requires API key in custom header
		},
		body: {
			username: trimmedUsername,
			password: credentials.password, // Don't trim - whitespace might be intentional
		},
		json: true, // Automatically parse JSON response
	};

	try {
		// Request token from TIA API
		const tokenData = (await this.helpers.httpRequest(options)) as TiaTokenResponse;

		// Cache the token with its expiration time for future requests
		// This prevents unnecessary authentication calls
		tokenCache.set(cacheKey, {
			token: tokenData.token,
			expiresOn: new Date(tokenData.expiresOn), // Convert ISO string to Date
		});

		return tokenData.token;
	} catch (error) {
		// Enhanced error logging to help debug authentication issues
		// Common issues: wrong credentials, network problems, API downtime
		const errorMessage = error.message || 'Unknown error';
		const statusCode = error.statusCode || error.status || 'No status code';
		let responseBody = 'No response data';

		// Try to extract response body for debugging
		// This can show specific error messages from the API
		if (error.response?.body) {
			try {
				responseBody = typeof error.response.body === 'string'
					? error.response.body
					: JSON.stringify(error.response.body);
			} catch {
				responseBody = 'Unable to parse response';
			}
		}

		// Throw detailed error with troubleshooting information
		throw new NodeApiError(this.getNode(), error, {
			message: 'Failed to authenticate with TIA API',
			description: `Status Code: ${statusCode}\nError: ${errorMessage}\nResponse: ${responseBody}\n\nPlease verify:\n- Base URL: ${credentials.baseUrl}\n- API Key is correct\n- Username is correct\n- Password is correct (special characters like " must work)\n\nRequest sent to: ${credentials.baseUrl}/v1/Token`,
		});
	}
}

/**
 * Make Authenticated Request to TIA API
 *
 * This is the main function for making API calls to TIA endpoints.
 * It handles:
 * - Automatic token retrieval and caching
 * - Proper authentication headers
 * - Automatic token refresh on expiration (401 errors)
 * - Detailed error logging
 *
 * @param this - n8n execution context
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param endpoint - API endpoint path (e.g., '/v1/Timesheet/all/1/2025')
 * @param body - Optional request body for POST/PUT requests
 * @param qs - Optional query string parameters
 * @returns API response data (single object or array)
 * @throws NodeApiError if request fails
 */
export async function tiaApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	// Get credentials configured in n8n
	const credentials = await this.getCredentials('tiaApi');
	const { baseUrl, apiKey, username } = credentials as unknown as TiaCredentials;

	// Get authentication token (uses cache if available)
	const token = await getTiaToken.call(this, credentials as unknown as TiaCredentials);

	// Build the authenticated request
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			'X-apikey': apiKey, // TIA requires API key in all requests
			Authorization: `Access_token ${token}`, // Token from authentication
		},
		json: true, // Automatically parse JSON responses
	};

	// Add optional request body (for POST/PUT requests)
	if (body) {
		options.body = body;
	}

	// Add optional query string parameters
	if (qs) {
		options.qs = qs;
	}

	try {
		// Execute the API request
		const response = await this.helpers.httpRequest(options);
		return response as IDataObject | IDataObject[];
	} catch (error) {
		// Handle 401 Unauthorized errors (expired token) with automatic retry
		// This ensures seamless operation even if token expires during execution
		if (error.statusCode === 401) {
			const cacheKey = `${baseUrl}:${username}`;
			tokenCache.delete(cacheKey); // Clear expired token from cache

			// Get fresh token and retry the request once
			const newToken = await getTiaToken.call(
				this,
				credentials as unknown as TiaCredentials,
			);
			options.headers!.Authorization = `Access_token ${newToken}`;

			try {
				const retryResponse = await this.helpers.httpRequest(options);
				return retryResponse as IDataObject | IDataObject[];
			} catch (retryError) {
				// If retry also fails, token is likely invalid (not just expired)
				throw new NodeApiError(this.getNode(), retryError, {
					message: 'TIA API request failed after token refresh',
				});
			}
		}

		// Handle all other errors with detailed debugging information
		const errorMessage = error.message || 'Unknown error';
		const statusCode = error.statusCode || error.status || 'No status code';
		let responseBody = 'No response data';

		// Extract response body if available (often contains specific error details)
		if (error.response?.body) {
			try {
				responseBody = typeof error.response.body === 'string'
					? error.response.body
					: JSON.stringify(error.response.body);
			} catch {
				responseBody = 'Unable to parse response';
			}
		}

		// Throw error with full context for debugging
		throw new NodeApiError(this.getNode(), error, {
			message: `TIA API request failed: ${method} ${endpoint}`,
			description: `Status: ${statusCode}\nError: ${errorMessage}\nResponse: ${responseBody}`,
		});
	}
}

/**
 * Make Authenticated Request with Automatic Pagination
 *
 * This function automatically handles pagination for endpoints that return large datasets.
 * It keeps requesting data until all items are retrieved.
 *
 * Pagination Strategy:
 * - Starts with offset=0 and limit=100
 * - Keeps fetching pages until response has fewer items than limit
 * - Increments offset by limit for each page
 * - Combines all pages into a single array
 *
 * Supports two response formats:
 * 1. Direct array: [item1, item2, ...]
 * 2. Wrapped in data property: { data: [item1, item2, ...] }
 *
 * @param this - n8n execution context
 * @param method - HTTP method (usually GET for pagination)
 * @param endpoint - API endpoint path
 * @param body - Optional request body
 * @param qs - Optional query string parameters (limit/offset will be added)
 * @returns Array of all items from all pages
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

	// Initialize pagination parameters
	const queryString = qs || {};
	queryString.limit = queryString.limit || 100; // Items per page
	queryString.offset = queryString.offset || 0; // Starting position

	// Keep fetching pages until we get all data
	while (hasMore) {
		response = await tiaApiRequest.call(this, method, endpoint, body, queryString);

		// Handle direct array response format
		if (Array.isArray(response)) {
			returnData.push(...response);
			// If we got fewer items than requested, we've reached the end
			if (response.length < (queryString.limit as number)) {
				hasMore = false;
			} else {
				// Move to next page
				queryString.offset = (queryString.offset as number) + (queryString.limit as number);
			}
		}
		// Handle wrapped response format (data property contains array)
		else if (
			response.data &&
			Array.isArray((response as IDataObject).data)
		) {
			const dataArray = (response as IDataObject).data as IDataObject[];
			returnData.push(...dataArray);
			// If we got fewer items than requested, we've reached the end
			if (dataArray.length < (queryString.limit as number)) {
				hasMore = false;
			} else {
				// Move to next page
				queryString.offset = (queryString.offset as number) + (queryString.limit as number);
			}
		}
		// Single object response (not an array) - no pagination needed
		else {
			returnData.push(response as IDataObject);
			hasMore = false;
		}
	}

	return returnData;
}
