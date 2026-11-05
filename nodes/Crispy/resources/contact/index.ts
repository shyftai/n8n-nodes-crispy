import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { rawBodyPostReceive } from '../../GenericFunctions';

const showOnlyForContactGetAll = {
	resource: ['contact'],
	operation: ['getAll'],
};

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				description: 'Get your Crispy contacts (CRM-enriched LinkedIn connections)',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/contacts',
					},
					output: {
						// This endpoint can return a CSV body on success instead of JSON
						// (confirmed against the live app/api/v1/contacts/route.ts
						// handler) — the raw response body is returned as-is rather
						// than assuming JSON, per the "Simplify" toggle below.
						postReceive: [rawBodyPostReceive],
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForContactGetAll },
		description: 'Whether to return a simplified version of the response instead of the raw data. Has no effect when Crispy returns a CSV body (Format = CSV below).',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForContactGetAll },
		options: [
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous call, to fetch the next page',
				routing: {
					send: {
						type: 'query',
						property: 'cursor',
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: 'Max number of results to return',
				routing: {
					send: {
						type: 'query',
						property: 'limit',
					},
				},
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'json',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'CSV', value: 'csv' },
				],
				description: 'Whether Crispy should return contacts as JSON or as a CSV file body',
				routing: {
					send: {
						type: 'query',
						property: 'format',
					},
				},
			},
			{
				displayName: 'Custom Attributes (JSON)',
				name: 'customAttrsJson',
				type: 'json',
				default: '{}',
				description:
					'Filter by custom contact attributes as a flat JSON object, for example {"industry": "SaaS"}',
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
							customAttrsJson?: string;
						};
						if (additionalFields.customAttrsJson) {
							try {
								const parsed = JSON.parse(additionalFields.customAttrsJson) as Record<
									string,
									string
								>;
								requestOptions.qs = requestOptions.qs ?? {};
								for (const [key, value] of Object.entries(parsed)) {
									requestOptions.qs[`custom_attrs[${key}]`] = value;
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
