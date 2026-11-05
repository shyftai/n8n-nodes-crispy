import type { INodeProperties } from 'n8n-workflow';
import { rawListPostReceive } from '../../GenericFunctions';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the connected account',
				description: 'Get the LinkedIn account connected to this API key',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/accounts',
					},
					output: {
						postReceive: [rawListPostReceive()],
					},
				},
			},
		],
		default: 'get',
	},
];
