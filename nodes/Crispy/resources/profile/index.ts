import type { INodeProperties } from 'n8n-workflow';
import { simplifyPostReceive } from '../../GenericFunctions';

const showOnlyForProfileGet = {
	resource: ['profile'],
	operation: ['get'],
};

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['profile'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a profile',
				description: 'Get a single LinkedIn profile by identifier',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/profiles/{{encodeURIComponent($parameter.identifier)}}',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: showOnlyForProfileGet },
		description:
			'The profile to fetch: a LinkedIn provider ID, a profile slug, or a full LinkedIn profile URL',
		placeholder: 'https://www.linkedin.com/in/EXAMPLE-profile',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForProfileGet },
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForProfileGet },
		options: [
			{
				displayName: 'LinkedIn API',
				name: 'linkedinApi',
				type: 'options',
				default: 'classic',
				description: 'Whether to fetch the profile via the classic LinkedIn API or Sales Navigator',
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
				displayName: 'Sections',
				name: 'sections',
				type: 'string',
				default: '',
				placeholder: 'experience,education,skills',
				description:
					'Comma-separated list of profile sections to fetch (fetching only what you need keeps you further from the daily profile-view limit)',
				routing: {
					send: {
						type: 'query',
						property: 'sections',
					},
				},
			},
		],
	},
];
