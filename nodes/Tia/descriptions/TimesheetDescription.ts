/**
 * Timesheet Resource Descriptions
 *
 * Defines the operations and fields for the Timesheet resource.
 * This modular approach keeps field definitions separate from the main node file.
 *
 * Structure:
 * - timesheetOperations: Dropdown menu for operation selection
 * - timesheetFields: Input fields that appear based on selected operation
 *
 * Note: displayOptions.show controls when fields appear based on resource/operation
 */

import type { INodeProperties } from 'n8n-workflow';

/**
 * Timesheet Operations
 * Defines the dropdown menu for selecting which operation to perform
 */
export const timesheetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['timesheet'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many timesheets for a specific month and year',
				action: 'Get many timesheets',
			},
			{
				name: 'Get By Period',
				value: 'getByPeriod',
				description: 'Get timesheets between two dates',
				action: 'Get timesheets by period',
			},
			{
				name: 'Get By User',
				value: 'getByUser',
				description: 'Get timesheets for a specific user, month, and year',
				action: 'Get timesheets by user',
			},
		],
		default: 'getAll',
	},
];

/**
 * Timesheet Fields
 *
 * Defines all input fields for timesheet operations.
 * Fields are grouped by operation using displayOptions.show
 *
 * Field Groups:
 * - Get All: month, year, additionalFields (returnAll, limit)
 * - Get By Period: startDate, endDate, additionalFields (returnAll, limit)
 * - Get By User: username, month, year, additionalFields (returnAll, limit)
 */
export const timesheetFields: INodeProperties[] = [
	// ====== GET ALL OPERATION FIELDS ======
	{
		displayName: 'Month',
		name: 'month',
		type: 'number',
		default: 1,
		typeOptions: {
			minValue: 1,
			maxValue: 12,
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getAll'],
			},
		},
		required: true,
		description: 'The month for which to retrieve timesheets (1-12)',
	},
	{
		displayName: 'Year',
		name: 'year',
		type: 'number',
		default: 2025,
		typeOptions: {
			minValue: 2000,
			maxValue: 2100,
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getAll'],
			},
		},
		required: true,
		description: 'The year for which to retrieve timesheets',
	},

	// ====== GET BY PERIOD OPERATION FIELDS ======
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByPeriod'],
			},
		},
		default: '',
		required: true,
		description: 'Start date of the period (format: YYYY-MM-DD)',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByPeriod'],
			},
		},
		default: '',
		required: true,
		description: 'End date of the period (format: YYYY-MM-DD)',
	},

	// ====== GET BY USER OPERATION FIELDS ======
	{
		displayName: 'Username Name or ID',
		name: 'username',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByUser'],
			},
		},
		default: '',
		required: true,
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'number',
		default: 1,
		typeOptions: {
			minValue: 1,
			maxValue: 12,
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByUser'],
			},
		},
		required: true,
		description: 'The month for which to retrieve timesheets (1-12)',
	},
	{
		displayName: 'Year',
		name: 'year',
		type: 'number',
		default: 2025,
		typeOptions: {
			minValue: 2000,
			maxValue: 2100,
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByUser'],
			},
		},
		required: true,
		description: 'The year for which to retrieve timesheets',
	},

	// ====== ADDITIONAL FIELDS (SHARED ACROSS ALL OPERATIONS) ======
	/**
	 * Optional fields available for all timesheet operations
	 *
	 * Return All:
	 * - When enabled: Uses pagination to fetch all results
	 * - When disabled: Returns limited results (default 50)
	 *
	 * Limit:
	 * - Only shown when "Return All" is disabled
	 * - Controls maximum number of results (1-500)
	 */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection', // Collection groups multiple optional fields
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timesheet'], // Show for all timesheet operations
			},
		},
		options: [
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						returnAll: [false], // Only show when Return All is disabled
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 50,
				description: 'Max number of results to return',
			},
		],
	},
];
