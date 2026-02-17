/**
 * TIA Custom Node for n8n
 *
 * This node provides integration with the TIA API,
 * allowing users to retrieve and manage timesheet data within n8n workflows.
 *
 * Current Features:
 * - Get timesheets for a specific month/year
 * - Get timesheets for a date period
 * - Get timesheets for a specific user
 *
 * Architecture:
 * - Tia.node.ts: Main node logic and execution
 * - descriptions/: Field and operation definitions (modular, one file per resource)
 * - helpers/tiaApi.ts: API authentication and request handling
 * - credentials/TiaApi.credentials.ts: Credential configuration
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { timesheetOperations, timesheetFields } from './descriptions';
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
						name: 'Timesheet',
						value: 'timesheet',
						description: 'Operations on timesheets (Uren)',
					},
					// Future resources can be added here (e.g., Invoices, Projects)
				],
				default: 'timesheet',
			},
			// Import operation and field definitions from separate files
			// This modular approach keeps the code organized and maintainable
			...timesheetOperations, // Operation dropdown (Get Many, Get By Period, etc.)
			...timesheetFields, // Fields for each operation (dates, limits, etc.)
		],
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

							// Apply limit if specified (default 50)
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
						 * - Alternative: yyyyMMdd (20250120) but may have issues
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

							// Apply limit if specified (default 50)
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

							// Apply limit if specified (default 50)
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
