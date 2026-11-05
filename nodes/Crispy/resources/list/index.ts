import type { INodeProperties } from 'n8n-workflow';
import { rawListPostReceive, simplifyPostReceive } from '../../GenericFunctions';

const showOnlyForListGetContacts = {
	resource: ['list'],
	operation: ['getContacts'],
};

const showOnlyForListAddContact = {
	resource: ['list'],
	operation: ['addContact'],
};

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many lists',
				description: 'Get your Crispy contact/account lists',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/lists',
					},
					output: {
						postReceive: [rawListPostReceive()],
					},
				},
			},
			{
				name: 'Get Contacts',
				value: 'getContacts',
				action: 'Get the contacts in a list',
				description: 'Get the contacts that belong to a Crispy list',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/lists/{{$parameter.listId.value}}/contacts',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
			{
				name: 'Add Contact',
				value: 'addContact',
				action: 'Add a contact to a list',
				description: 'Add an existing contact to a Crispy list (does not send anything on LinkedIn)',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/lists/{{$parameter.listId.value}}/contacts',
					},
					output: {
						postReceive: [rawListPostReceive()],
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'List',
		name: 'listId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Crispy list to operate on',
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['getContacts', 'addContact'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLists',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'EXAMPLE-list-id',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForListGetContacts },
		options: [
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous call, to fetch the next page',
				routing: {
					send: { type: 'query', property: 'cursor' },
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
					send: { type: 'query', property: 'limit' },
				},
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForListGetContacts },
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: showOnlyForListAddContact },
		description: 'The contact to add: a Crispy provider ID or other contact identifier',
		placeholder: 'EXAMPLE-provider-ID',
		routing: {
			send: {
				type: 'body',
				property: 'provider_id',
			},
		},
	},
];
