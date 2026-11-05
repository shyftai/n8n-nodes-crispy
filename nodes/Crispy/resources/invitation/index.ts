import type { INodeProperties } from 'n8n-workflow';
import { rawListPostReceive } from '../../GenericFunctions';

const showOnlyForInvitationSend = {
	resource: ['invitation'],
	operation: ['send'],
};

export const invitationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['invitation'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send an invitation',
				description: 'Send a LinkedIn connection request. This sends a real connection request when executed for real — a daily send limit applies to your account.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/network/invitations',
					},
					output: {
						postReceive: [rawListPostReceive()],
					},
				},
			},
		],
		default: 'send',
	},
	{
		displayName: 'Profile',
		name: 'profileUrl',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: showOnlyForInvitationSend },
		description:
			'The person to invite: a LinkedIn provider ID, a profile slug, or a full LinkedIn profile URL (despite the field name, all three forms are accepted)',
		placeholder: 'https://www.linkedin.com/in/EXAMPLE-profile',
		routing: {
			send: { type: 'body', property: 'profile_url' },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForInvitationSend },
		options: [
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Optional note to include with the connection request (up to 300 characters)',
				placeholder: 'EXAMPLE invitation note',
				routing: { send: { type: 'body', property: 'message' } },
			},
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				description: 'Associate this invitation with a Crispy campaign',
				routing: { send: { type: 'body', property: 'campaign_id' } },
			},
		],
	},
];
