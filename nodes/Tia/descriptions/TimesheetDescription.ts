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
			{
				name: 'Get Completion Status',
				value: 'getCompletionStatus',
				description: 'Get timesheet completion status for all employees in a company',
				action: 'Get timesheet completion status',
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
// Dynamic defaults: evaluated once when n8n loads the node
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed

export const timesheetFields: INodeProperties[] = [
	// ====== GET ALL OPERATION FIELDS ======
	{
		displayName: 'Month',
		name: 'month',
		type: 'number',
		default: currentMonth,
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
		default: currentYear,
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
		displayName: 'Username',
		name: 'username',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByPeriod'],
			},
		},
		default: '',
		// NOT required: true — removed for AI Agent compatibility.
		// Validated at runtime in Tia.node.ts.
		description: 'The username to retrieve timesheets for. Use the User > Get Many operation to find available usernames.',
	},
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
		displayName: 'Username',
		name: 'username',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getByUser'],
			},
		},
		default: '',
		// NOT required: true — removed for AI Agent compatibility.
		// When this node is used as a tool by an n8n AI Agent, required fields with
		// empty defaults cause immediate validation errors before the agent can fill
		// them in. Instead, we validate in the execute logic (Tia.node.ts) and throw
		// a clear error if the username is missing.
		description: 'The username to retrieve timesheets for. Use the User > Get Many operation to find available usernames.',
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'number',
		default: currentMonth,
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
		default: currentYear,
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

	// ====== GET COMPLETION STATUS OPERATION FIELDS ======
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'number',
		default: '',
		placeholder: 'e.g. 1234567',
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getCompletionStatus'],
			},
		},
		// NOT required: true — removed for AI Agent compatibility.
		description: 'The company ID to check completion status for. You can find this in your TIA account.',
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'number',
		default: currentMonth,
		typeOptions: {
			minValue: 1,
			maxValue: 12,
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getCompletionStatus'],
			},
		},
		required: true,
		description: 'The month for which to check completion status (1-12)',
	},
	{
		displayName: 'Year',
		name: 'year',
		type: 'number',
		default: currentYear,
		typeOptions: {
			minValue: 2000,
			maxValue: 2100,
		},
		displayOptions: {
			show: {
				resource: ['timesheet'],
				operation: ['getCompletionStatus'],
			},
		},
		required: true,
		description: 'The year for which to check completion status',
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
				/**
				 * Custom default: 10 instead of n8n's standard 50
				 *
				 * Reason: Provides better UX with a smaller initial dataset. Most users
				 * query timesheets for recent entries and don't need 50 results at once.
				 * This reduces data transfer and improves response time.
				 *
				 * ESLint override: n8n-nodes-base/node-param-default-wrong-for-limit enforces 50
				 */
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
				default: 10,
				description: 'Max number of results to return',
			},
		],
	},
];
