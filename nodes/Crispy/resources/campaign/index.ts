import type { INodeProperties } from 'n8n-workflow';
import { simplifyPostReceive } from '../../GenericFunctions';

const showOnlyForCampaignGetAll = {
	resource: ['campaign'],
	operation: ['getAll'],
};

const showOnlyWithCampaignId = {
	resource: ['campaign'],
	operation: ['get', 'getStats'],
};

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaigns',
				description: 'Get your Crispy outreach campaigns',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/campaigns',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a campaign',
				description: 'Get a single Crispy campaign by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/campaigns/{{encodeURIComponent($parameter.campaignId.value || $parameter.campaignId)}}',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
			{
				name: 'Get Stats',
				value: 'getStats',
				action: 'Get campaign stats',
				description: 'Get performance statistics for a Crispy campaign',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/campaigns/{{encodeURIComponent($parameter.campaignId.value || $parameter.campaignId)}}/stats',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Campaign',
		name: 'campaignId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Crispy campaign to operate on',
		displayOptions: { show: showOnlyWithCampaignId },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCampaigns',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'EXAMPLE-campaign-id',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForCampaignGetAll },
		options: [
			{
				displayName: 'Include Archived',
				name: 'includeArchived',
				type: 'boolean',
				default: false,
				description: 'Whether to also include archived campaigns in the results',
				routing: {
					send: { type: 'query', property: 'include_archived' },
				},
			},
		],
	},
];
