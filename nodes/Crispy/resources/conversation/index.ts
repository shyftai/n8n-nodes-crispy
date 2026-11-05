import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { rawListPostReceive, simplifyPostReceive } from '../../GenericFunctions';

const showOnlyForConversationGetAll = {
	resource: ['conversation'],
	operation: ['getAll'],
};

const showOnlyWithChatId = {
	resource: ['conversation'],
	operation: ['getMessages', 'sendMessage'],
};

const showOnlyForGetMessages = {
	resource: ['conversation'],
	operation: ['getMessages'],
};

const showOnlyForSendMessage = {
	resource: ['conversation'],
	operation: ['sendMessage'],
};

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['conversation'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many conversations',
				description: 'Get your Crispy inbox conversations',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/inbox/conversations',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
			{
				name: 'Get Messages',
				value: 'getMessages',
				action: 'Get messages in a conversation',
				description: 'Get the messages in a single Crispy inbox conversation',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/inbox/conversations/{{encodeURIComponent($parameter.chatId.value || $parameter.chatId)}}/messages',
					},
					output: {
						postReceive: [simplifyPostReceive(10)],
					},
				},
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				action: 'Send a message',
				description: 'Send a LinkedIn message in an existing conversation. This sends a real message when executed for real — a daily send limit applies to your account.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/inbox/conversations/{{encodeURIComponent($parameter.chatId.value || $parameter.chatId)}}/messages',
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
		displayName: 'Conversation',
		name: 'chatId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Crispy inbox conversation to operate on',
		displayOptions: { show: showOnlyWithChatId },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchConversations',
					searchable: true,
				},
			},
			{
				displayName: 'Chat ID',
				name: 'id',
				type: 'string',
				placeholder: 'EXAMPLE-chat-id',
			},
		],
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: showOnlyForSendMessage },
		description: 'The message text to send (up to 8000 characters). Either this or Voice Note URL is required.',
		placeholder: 'EXAMPLE reply text',
		// Intentionally no `routing.send` here: an empty text value must NOT be
		// sent in the body when the user is sending a voice-note-only message.
		// See the preSend function below (in additionalFieldsSendMessage's
		// routing), which only adds `text` to the body when it's non-empty.
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['getAll', 'getMessages'],
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
		displayOptions: { show: showOnlyForConversationGetAll },
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: 'Max number of results to return',
				routing: { send: { type: 'query', property: 'limit' } },
			},
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous call, to fetch the next page',
				routing: { send: { type: 'query', property: 'cursor' } },
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description: 'Crispy inbox filter to apply (for example unread)',
				routing: { send: { type: 'query', property: 'filter' } },
			},
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				description: 'Only return conversations linked to this campaign',
				routing: { send: { type: 'query', property: 'campaign_id' } },
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsGetMessages',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForGetMessages },
		options: [
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous call, to fetch the next page',
				routing: { send: { type: 'query', property: 'cursor' } },
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsSendMessage',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForSendMessage },
		options: [
			{
				displayName: 'Voice Note URL',
				name: 'voiceNoteUrl',
				type: 'string',
				default: '',
				description: 'URL of a voice note to send instead of (or alongside) text. Either Text or this field is required.',
				routing: { send: { type: 'body', property: 'voice_note_url' } },
			},
			{
				displayName: 'Attachments (JSON)',
				name: 'attachmentsJson',
				type: 'json',
				default: '[]',
				description: 'Array of attachments to send, each an object with "URL" and "filename", for example [{"URL": "https://EXAMPLE.test/file.pdf", "filename": "file.pdf"}]',
			},
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				description: 'Associate this message with a Crispy campaign',
				routing: { send: { type: 'body', property: 'campaign_id' } },
			},
		],
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						// Only include `text` in the body when it is non-empty: the API
						// allows sending ONLY a voice note, and sending `"text": ""`
						// alongside voice_note_url would be wrong/misleading.
						const text = this.getNodeParameter('text', '') as string;
						if (text) {
							requestOptions.body = {
								...((requestOptions.body as object) ?? {}),
								text,
							};
						}
						return requestOptions;
					},
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const additionalFields = this.getNodeParameter('additionalFieldsSendMessage', {}) as {
							attachmentsJson?: string | unknown[];
						};
						if (additionalFields.attachmentsJson) {
							try {
								const raw = additionalFields.attachmentsJson;
								const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
								if (Array.isArray(parsed) && parsed.length > 0) {
									requestOptions.body = {
										...((requestOptions.body as object) ?? {}),
										attachments: parsed,
									};
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
