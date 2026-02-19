/**
 * Invoice Line Resource Descriptions
 *
 * Defines the operations and fields for the Invoice Line resource.
 *
 * Operations:
 * - Search: Query invoice lines with optional date and status filters
 *
 * Important Notes:
 * - The TIA API does not support a limit parameter for this endpoint
 * - Limit is applied client-side in the main execution logic
 * - API response format varies (see DEVELOPER.md for details)
 * - Date format: yyyy-MM-dd HH:mm:ss:ffZ (automatically converted)
 *
 * Status IDs:
 * - 1 = Proforma / Draft
 * - 6 = Invoiced
 * - '' (empty) = Any status
 */

import type { INodeProperties } from 'n8n-workflow';

export const invoiceLineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['invoiceLine'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				action: 'Search invoice lines',
				description: 'Search for invoice lines',
			},
		],
		default: 'search',
	},
];

export const invoiceLinesFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['invoiceLine'],
				operation: ['search'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['invoiceLine'],
				operation: ['search'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		/**
		 * Custom default: 10 instead of n8n's standard 50
		 *
		 * Reason: Invoice line objects contain large nested structures (customer, supplier,
		 * product, etc.). Using 10 as default reduces initial data transfer and provides
		 * better UX for users who typically need only recent results.
		 *
		 * ESLint override: n8n-nodes-base/node-param-default-wrong-for-limit enforces 50
		 */
		// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Created After',
		name: 'createdFrom',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['invoiceLine'],
				operation: ['search'],
			},
		},
		description: 'Return invoice lines created on or after this date',
	},
	//Filter on status (6 = invoiced)
	{
		displayName: 'Status ID',
		name: 'statusId',
		type: 'options',
		default: '',
		options: [
			{ name: 'Any', value: '' },
			{ name: 'Invoiced (6)', value: 6 },
			{ name: 'Proforma / Draft', value: 1 },
		],
		displayOptions: {
			show: {
				resource: ['invoiceLine'],
				operation: ['search'],
			},
		},
		description: 'Filter by status',
	},
];
