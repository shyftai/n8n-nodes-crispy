import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { accountOperations } from './resources/account';
import { personOperations } from './resources/person';
import { profileOperations } from './resources/profile';
import { contactOperations } from './resources/contact';
import { listOperations } from './resources/list';
import { campaignOperations } from './resources/campaign';
import { conversationOperations } from './resources/conversation';
import { invitationOperations } from './resources/invitation';
import { searchCampaigns, searchConversations, searchLists } from './GenericFunctions';

export class Crispy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crispy',
		name: 'crispy',
		icon: 'file:crispy.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Crispy LinkedIn automation API',
		defaults: {
			name: 'Crispy',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'crispyApi', required: true }],
		requestDefaults: {
			baseURL: 'https://crispy.sh',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Invitation', value: 'invitation' },
					{ name: 'List', value: 'list' },
					{ name: 'Person', value: 'person' },
					{ name: 'Profile', value: 'profile' },
				],
				default: 'account',
			},
			...accountOperations,
			...personOperations,
			...profileOperations,
			...contactOperations,
			...listOperations,
			...campaignOperations,
			...conversationOperations,
			...invitationOperations,
		],
	};

	methods = {
		listSearch: {
			searchLists,
			searchCampaigns,
			searchConversations,
		},
	};
}
