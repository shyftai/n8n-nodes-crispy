import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CrispyApi implements ICredentialType {
	name = 'crispyApi';

	displayName = 'Crispy API';

	icon = 'file:../nodes/Crispy/crispy.svg' as const;

	documentationUrl = 'https://github.com/shyftai/n8n-nodes-crispy?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Your Crispy API key. Generate one from your Crispy dashboard settings after connecting a LinkedIn account.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://crispy.sh',
			url: '/api/v1/accounts',
			method: 'GET',
		},
	};
}
