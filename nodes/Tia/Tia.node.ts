/**
 * TIA Custom Node for n8n
 *
 * This node provides integration with the TIA API,
 * allowing users to retrieve and manage timesheets, invoice lines, and user data within n8n workflows.
 *
 * Current Features:
 * - Timesheet operations: Get by month/year, period, or user
 * - User operations: Get all users
 * - Invoice Line operations: Search with date and status filters
 *
 * Architecture:
 * - Tia.node.ts: Main node logic and execution
 * - descriptions/: Field and operation definitions (modular, one file per resource)
 * - helpers/tiaApi.ts: API authentication and request handling
 * - credentials/TiaApi.credentials.ts: Credential configuration
 *
 * For detailed developer documentation, see DEVELOPER.md in the project root.
 */

import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	timesheetOperations,
	timesheetFields,
	userOperations,
	userFields,
	invoiceLineOperations,
	invoiceLinesFields,
} from './descriptions';
import { tiaApiRequest, tiaApiRequestAllItems } from './helpers/tiaApi';

/**
 * TIA Node Implementation
 *
 * Handles the execution of TIA API operations within n8n workflows.
 * Supports multiple operations on different resources (currently just timesheets).
 */
export class Tia implements INodeType {
	/**
	 * Node Description
	 *
	 * Defines how the node appears and behaves in n8n:
	 * - Display name, icon, and categorization
	 * - Input/output connections
	 * - Available resources and operations
	 * - Credential requirements
	 */
	description: INodeTypeDescription = {
		displayName: 'TIA',
		name: 'tia',
		icon: 'file:dots-and-arrows.svg',
		group: ['transform'], // Node category in n8n
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Dynamic subtitle
		description: 'Interact with TIA API for timesheets and invoices',
		defaults: {
			name: 'TIA',
		},
		inputs: [NodeConnectionTypes.Main], // Accepts input from previous nodes
		outputs: [NodeConnectionTypes.Main], // Outputs data to next nodes
		usableAsTool: true, // Can be used as an AI tool/agent
		credentials: [
			{
				name: 'tiaApi', // References TiaApi.credentials.ts
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			// Resource selector (currently only Timesheet)
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Invoice Line',
						value: 'invoiceLine',
						description: 'Search and manage invoice lines',
					},
					{
						name: 'Timesheet',
						value: 'timesheet',
						description: 'Operations on timesheets (Uren)',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Get user details',
					},
				],
				default: 'timesheet',
			},
			// Import operation and field definitions from separate files
			// This modular approach keeps the code organized and maintainable
			...timesheetOperations, // Operation dropdown (Get Many, Get By Period, etc.)
			...timesheetFields, // Fields for each operation (dates, limits, etc.)
			...userOperations,
			...userFields,
			...invoiceLineOperations,
			...invoiceLinesFields,
		],
	};

	/**
	 * Methods for dynamic option loading
	 *
	 * These methods are called by n8n when a field uses loadOptionsMethod.
	 * They fetch data from the API to populate dropdowns dynamically.
	 */
	methods = {
		loadOptions: {
			// Fetches all users from TIA API and returns them as dropdown options
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('tiaApi');
				const baseUrl = credentials.baseUrl as string;
				const apiKey = credentials.apiKey as string;

				// Get a token first
				const tokenResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: `${baseUrl}/v1/Token`,
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						'X-apikey': apiKey,
					},
					body: {
						username: credentials.username,
						password: credentials.password,
					},
					json: true,
				});

				// Fetch users with the token
				const users = await this.helpers.httpRequest({
					method: 'GET',
					url: `${baseUrl}/v1/User`,
					headers: {
						'Content-Type': 'application/json',
						'X-apikey': apiKey,
						Authorization: `Access_token ${tokenResponse.token}`,
					},
					json: true,
				});

				// Map users to dropdown options
				if (Array.isArray(users)) {
					return users.map((user: IDataObject) => ({
						name: (user.username as string) || (user.userName as string) || String(user.id),
						value: (user.username as string) || (user.userName as string) || String(user.id),
					}));
				}

				return [];
			},
		},
	};

	/**
	 * Execute Function
	 *
	 * This is called when the workflow runs and reaches this node.
	 * It processes each input item and executes the selected operation.
	 *
	 * Flow:
	 * 1. Get input data from previous nodes
	 * 2. Determine which resource and operation to execute
	 * 3. Loop through each input item
	 * 4. Execute the appropriate API call
	 * 5. Format and return the results
	 *
	 * Error Handling:
	 * - If "Continue on Fail" is enabled, errors are captured in output
	 * - Otherwise, errors stop workflow execution
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Get data passed from previous nodes
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get user-selected resource and operation
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		// Process each input item (n8n nodes can handle multiple items at once)
		for (let i = 0; i < items.length; i++) {
			try {
				// Route to appropriate resource handler
				if (resource === 'timesheet') {
					// ====== TIMESHEET OPERATIONS ======

					if (operation === 'getAll') {
						/**
						 * GET ALL TIMESHEETS
						 * Retrieves all timesheets for a specific month and year
						 * Endpoint: GET /v1/Timesheet/all/{month}/{year}
						 */
						const month = this.getNodeParameter('month', i) as number;
						const year = this.getNodeParameter('year', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const endpoint = `/v1/Timesheet/all/${month}/${year}`;

						let responseData: IDataObject | IDataObject[];

						// Check if user wants all results or limited results
						if (additionalFields.returnAll === true) {
							// Fetch all pages using pagination
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint);
						} else {
							// Fetch single page
							responseData = await tiaApiRequest.call(this, 'GET', endpoint);

							// Apply limit if specified (default 10)
							if (additionalFields.limit && Array.isArray(responseData)) {
								responseData = responseData.slice(0, additionalFields.limit as number);
							}
						}

						// Format response data for n8n
						// API can return either a single object or an array
						if (Array.isArray(responseData)) {
							// Array response: create one output item per timesheet
							responseData.forEach((item) => {
								returnData.push({
									json: item, // Timesheet data
									pairedItem: { item: i }, // Link to input item
								});
							});
						} else {
							// Single object response
							returnData.push({
								json: responseData,
								pairedItem: { item: i },
							});
						}
					} else if (operation === 'getByPeriod') {
						/**
						 * GET TIMESHEETS BY PERIOD
						 * Retrieves timesheets between two dates
						 * Endpoint: GET /v1/Timesheet/period/{startDate}/{endDate}
						 *
						 * NOTE: TIA API requires specific date format:
						 * - Format: yyyy-MM-dd HH:mm:ss:ffZ
						 * - Example: 2025-01-20 00:00:00:00Z
						 * - Alternative: yyyyMMdd (20250120)
						 */
						const startDate = this.getNodeParameter('startDate', i) as string;
						const endDate = this.getNodeParameter('endDate', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// Convert n8n date format to TIA API format
						// n8n provides: 2025-01-01T00:00:00 (ISO 8601)
						// TIA expects: 2025-01-01 00:00:00:00Z
						const formattedStartDate = startDate.split('T')[0] + ' 00:00:00:00Z';
						const formattedEndDate = endDate.split('T')[0] + ' 23:59:59:99Z';

						// Build API endpoint with formatted dates
						const endpoint = `/v1/Timesheet/period/${formattedStartDate}/${formattedEndDate}`;

						let responseData: IDataObject | IDataObject[];

						// Check if user wants all results or limited results
						if (additionalFields.returnAll === true) {
							// Fetch all pages using pagination
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint);
						} else {
							// Fetch single page
							responseData = await tiaApiRequest.call(this, 'GET', endpoint);

							// Apply limit if specified (default 10)
							if (additionalFields.limit && Array.isArray(responseData)) {
								responseData = responseData.slice(0, additionalFields.limit as number);
							}
						}

						// Format response data for n8n
						if (Array.isArray(responseData)) {
							responseData.forEach((item) => {
								returnData.push({
									json: item,
									pairedItem: { item: i },
								});
							});
						} else {
							returnData.push({
								json: responseData,
								pairedItem: { item: i },
							});
						}
					} else if (operation === 'getByUser') {
						/**
						 * GET TIMESHEETS BY USER
						 * Retrieves timesheets for a specific user and month/year
						 * Endpoint: GET /v1/Timesheet/{username}/{month}/{year}
						 */
						const username = this.getNodeParameter('username', i) as string;
						const month = this.getNodeParameter('month', i) as number;
						const year = this.getNodeParameter('year', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const endpoint = `/v1/Timesheet/${username}/${month}/${year}`;

						let responseData: IDataObject | IDataObject[];

						// Check if user wants all results or limited results
						if (additionalFields.returnAll === true) {
							// Fetch all pages using pagination
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint);
						} else {
							// Fetch single page
							responseData = await tiaApiRequest.call(this, 'GET', endpoint);

							// Apply limit if specified (default 10)
							if (additionalFields.limit && Array.isArray(responseData)) {
								responseData = responseData.slice(0, additionalFields.limit as number);
							}
						}

						// Format response data for n8n
						if (Array.isArray(responseData)) {
							responseData.forEach((item) => {
								returnData.push({
									json: item,
									pairedItem: { item: i },
								});
							});
						} else {
							returnData.push({
								json: responseData,
								pairedItem: { item: i },
							});
						}
					}
				} else if (resource === 'user') {
					if (operation === 'getAll') {
						const endpoint = '/v1/User';

						const responseData = await tiaApiRequest.call(this, 'GET', endpoint);

						if (Array.isArray(responseData)) {
							responseData.forEach((item) => {
								returnData.push({
									json: item,
									pairedItem: { item: i },
								});
							});
						} else {
							returnData.push({
								json: responseData,
								pairedItem: { item: i },
							});
						}
					}
				} else if (resource === 'invoiceLine') {
					// ====== INVOICE LINE OPERATIONS ======

					if (operation === 'search') {
						/**
						 * SEARCH INVOICE LINES
						 * Search invoice lines with optional filters
						 * Endpoint: GET /v1/InvoiceLine/search?createdFrom=...&statusId=...
						 */
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = this.getNodeParameter('limit', i, 10) as number;
						const createdFrom = this.getNodeParameter('createdFrom', i, '') as string;
						const statusId = this.getNodeParameter('statusId', i, '') as string | number;

						// Build query string parameters
						const qs: IDataObject = {};

						// Add createdFrom filter if provided
						if (createdFrom) {
							// Convert n8n date to TIA format: yyyy-MM-dd HH:mm:ss:ffZ
							const formattedDate = createdFrom.split('T')[0] + ' 00:00:00:00Z';
							qs.createdFrom = formattedDate;
						}

						// Add statusId filter if provided
						if (statusId !== '') {
							qs.statusId = statusId;
						}

						const endpoint = '/v1/InvoiceLine/search';

						let responseData: IDataObject | IDataObject[];

						// Check if user wants all results or limited results
						if (returnAll) {
							// Fetch all pages using pagination
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint, undefined, qs);
						} else {
							// Fetch first page from API (API doesn't support limit parameter)
							responseData = await tiaApiRequest.call(this, 'GET', endpoint, undefined, qs);
						}

						// Extract invoiceLines array from response
						// API can return different structures:
						// - [{ "invoiceLines": [...] }] (wrapped)
						// - { "invoiceLines": [...] } (unwrapped object)
						// - [...] (direct array)
						let invoiceLines: IDataObject[] = [];

						if (Array.isArray(responseData)) {
							// Check if it's a wrapped response: [{ "invoiceLines": [...] }]
							if (responseData.length > 0) {
								const firstItem = responseData[0] as IDataObject;
								if (firstItem.invoiceLines && Array.isArray(firstItem.invoiceLines)) {
									invoiceLines = firstItem.invoiceLines as IDataObject[];
								} else {
									// Direct array of invoice lines
									invoiceLines = responseData as IDataObject[];
								}
							}
						} else if (responseData && typeof responseData === 'object') {
							// Unwrapped object: { "invoiceLines": [...] }
							const dataObj = responseData as IDataObject;
							if (dataObj.invoiceLines && Array.isArray(dataObj.invoiceLines)) {
								invoiceLines = dataObj.invoiceLines as IDataObject[];
							}
						}

						// Apply limit client-side if not returning all
						if (!returnAll && invoiceLines.length > limit) {
							invoiceLines = invoiceLines.slice(0, limit);
						}

						// Format response data for n8n
						if (invoiceLines.length > 0) {
							invoiceLines.forEach((item) => {
								returnData.push({
									json: item,
									pairedItem: { item: i },
								});
							});
						} else {
							// No invoice lines found - return raw response for debugging
							returnData.push({
								json: { message: 'No invoice lines found', rawResponse: responseData },
								pairedItem: { item: i },
							});
						}
					}
				}
			} catch (error) {
				/**
				 * Error Handling
				 *
				 * If "Continue on Fail" is enabled in node settings:
				 * - Capture error as output item
				 * - Continue processing remaining items
				 *
				 * If "Continue on Fail" is disabled (default):
				 * - Stop workflow execution
				 * - Show error message to user
				 */
				if (this.continueOnFail()) {
					// Add error as output item and continue
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				// Throw error to stop workflow
				throw new NodeOperationError(this.getNode(), error, {
					itemIndex: i,
					description: error.description,
				});
			}
		}

		// Return all collected data to the next node
		// Wrapped in array because n8n nodes can have multiple output connections
		return [returnData];
	}
}
