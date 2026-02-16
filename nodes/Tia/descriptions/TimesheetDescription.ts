import type { INodeProperties } from 'n8n-workflow';

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

export const timesheetFields: INodeProperties[] = [
	// Fields for Get All operation
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

	// Fields for Get By Period operation
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

	// Fields for Get By User operation
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
		required: true,
		description: 'Username of the consultant',
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

	// Additional options (optional for all operations)
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timesheet'],
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
						returnAll: [false],
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
