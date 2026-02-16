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

export class Tia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TIA',
		name: 'tia',
		icon: { light: 'file:Tia.svg', dark: 'file:Tia.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with TIA API for timesheets and invoices',
		defaults: {
			name: 'TIA',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'tiaApi',
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
				],
				default: 'timesheet',
			},
			...timesheetOperations,
			...timesheetFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'timesheet') {
					// Handle Timesheet operations
					if (operation === 'getAll') {
						// Get all timesheets for a month/year
						const month = this.getNodeParameter('month', i) as number;
						const year = this.getNodeParameter('year', i) as number;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const endpoint = `/v1/Timesheet/all/${month}/${year}`;

						let responseData: IDataObject | IDataObject[];

						if (additionalFields.returnAll === true) {
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint);
						} else {
							responseData = await tiaApiRequest.call(this, 'GET', endpoint);

							// Limit results if specified
							if (additionalFields.limit && Array.isArray(responseData)) {
								responseData = responseData.slice(0, additionalFields.limit as number);
							}
						}

						// Handle response - could be single object or array
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
					} else if (operation === 'getByPeriod') {
						// Get timesheets by period
						const startDate = this.getNodeParameter('startDate', i) as string;
						const endDate = this.getNodeParameter('endDate', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						// Format dates to YYYY-MM-DD if they include time
						const formattedStartDate = startDate.split('T')[0];
						const formattedEndDate = endDate.split('T')[0];

						const endpoint = `/v1/Timesheet/period/${formattedStartDate}/${formattedEndDate}`;

						let responseData: IDataObject | IDataObject[];

						if (additionalFields.returnAll === true) {
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint);
						} else {
							responseData = await tiaApiRequest.call(this, 'GET', endpoint);

							// Limit results if specified
							if (additionalFields.limit && Array.isArray(responseData)) {
								responseData = responseData.slice(0, additionalFields.limit as number);
							}
						}

						// Handle response - could be single object or array
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
						// Get timesheets by user
						const username = this.getNodeParameter('username', i) as string;
						const month = this.getNodeParameter('month', i) as number;
						const year = this.getNodeParameter('year', i) as number;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						const endpoint = `/v1/Timesheet/${username}/${month}/${year}`;

						let responseData: IDataObject | IDataObject[];

						if (additionalFields.returnAll === true) {
							responseData = await tiaApiRequestAllItems.call(this, 'GET', endpoint);
						} else {
							responseData = await tiaApiRequest.call(this, 'GET', endpoint);

							// Limit results if specified
							if (additionalFields.limit && Array.isArray(responseData)) {
								responseData = responseData.slice(0, additionalFields.limit as number);
							}
						}

						// Handle response - could be single object or array
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
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, {
					itemIndex: i,
					description: error.description,
				});
			}
		}

		return [returnData];
	}
}
