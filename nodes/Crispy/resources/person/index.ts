import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { simplifyPostReceive } from '../../GenericFunctions';

const showOnlyForPersonSearch = {
	resource: ['person'],
	operation: ['search'],
};

export const personOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['person'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				action: 'Search for people',
				description: 'Search LinkedIn people matching a keyword and optional filters',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/search/people',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
		],
		default: 'search',
	},
	{
		displayName: 'Keywords',
		name: 'keywords',
		type: 'string',
		default: '',
		displayOptions: { show: showOnlyForPersonSearch },
		description: 'Free-text keywords to match against people (name, title, company, and so on)',
		routing: {
			send: {
				type: 'query',
				property: 'keywords',
			},
		},
	},
	{
		displayName: 'LinkedIn API',
		name: 'linkedinApi',
		type: 'options',
		default: 'classic',
		displayOptions: { show: showOnlyForPersonSearch },
		description: 'Whether to search using the classic LinkedIn search or Sales Navigator',
		options: [
			{ name: 'Classic', value: 'classic' },
			{ name: 'Sales Navigator', value: 'sales_navigator' },
		],
		routing: {
			send: {
				type: 'query',
				property: 'linkedin_api',
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForPersonSearch },
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForPersonSearch },
		description:
			'Extra search filters supported by the Crispy people-search API, sent through as query parameters (for example company, title, location, network distance)',
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Extra Query Parameters (JSON)',
				name: 'extraQueryParametersJson',
				type: 'json',
				default: '{}',
				description: 'Any other Crispy people-search query fields as a flat JSON object, for example {"title": "VP Engineering", "network_distance": "2"}. Sent through unmodified as query parameters.',
			},
		],
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const additionalFields = this.getNodeParameter('additionalFields', {}) as {
							limit?: number;
							extraQueryParametersJson?: string;
						};
						requestOptions.qs = requestOptions.qs ?? {};
						if (additionalFields.limit) {
							requestOptions.qs.limit = additionalFields.limit;
						}
						if (additionalFields.extraQueryParametersJson) {
							try {
								const parsed = JSON.parse(additionalFields.extraQueryParametersJson);
								if (parsed && typeof parsed === 'object') {
									Object.assign(requestOptions.qs, parsed);
								}
							} catch {
								// Invalid JSON is ignored rather than sent through untyped.
							}
						}
						return requestOptions;
					},
				],
			},
		},
	},
];
