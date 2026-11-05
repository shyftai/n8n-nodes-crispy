import { createHmac, timingSafeEqual } from 'crypto';

import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

const CRISPY_BASE_URL = 'https://crispy.sh';

// The 5 events agreed for v1 scope. Crispy's full VALID_EVENTS list has more,
// but only these are exposed here.
const EVENT_OPTIONS = [
	{
		name: 'Account Disconnected',
		value: 'account.disconnected',
		description: 'The connected LinkedIn account was disconnected',
	},
	{
		name: 'Campaign Completed',
		value: 'campaign.completed',
		description: 'A Crispy outreach campaign finished running',
	},
	{
		name: 'Invitation Accepted',
		value: 'invitation.accepted',
		description: 'Someone accepted a LinkedIn connection request sent through Crispy',
	},
	{
		name: 'Invitation Received',
		value: 'invitation.received',
		description: 'A new LinkedIn connection request was received',
	},
	{
		name: 'Message Received',
		value: 'message.received',
		description: 'A message arrived in a LinkedIn conversation. Crispy relays both inbound replies and the account owner’s own outbound sends on the same event — check the delivery’s "direction" field.',
	},
];

interface CrispyTriggerStaticData extends IDataObject {
	webhookId?: string;
	signingSecret?: string;
}

function extractWebhookList(body: unknown): IDataObject[] {
	if (Array.isArray(body)) return body as IDataObject[];
	if (body && typeof body === 'object') {
		const obj = body as IDataObject;
		if (Array.isArray(obj.webhooks)) return obj.webhooks as IDataObject[];
		if (Array.isArray(obj.data)) return obj.data as IDataObject[];
	}
	return [];
}

function setsEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return sortedA.every((value, index) => value === sortedB[index]);
}

/**
 * Verifies a Crispy v1 webhook delivery.
 *
 * Per https://crispy.sh/docs/guides/webhooks ("Signature verification (v1)"),
 * confirmed directly against the live Crispy docs while building this node:
 * Crispy signs the literal string `v1.<t>.<rawBody>` with the webhook's
 * signing secret (HMAC-SHA256) and sends the header
 * `Webhook-Signature: v1,t=<t>,s=<hex_digest>`. The timestamp lives inside
 * that header's `t=` field, there is no separate timestamp header. This
 * implementation was NOT exercised against a real inbound delivery during
 * this build (see README "Webhook signature verification" note) — it mirrors
 * the documented reference implementation exactly.
 */
function verifyWebhookSignatureV1(
	rawBody: string,
	signatureHeader: string | undefined,
	secret: string,
): boolean {
	if (!signatureHeader) return false;
	const parts = signatureHeader.split(',').map((part) => part.trim());
	if (parts[0] !== 'v1') return false;

	let timestamp = '';
	let signature = '';
	for (const part of parts.slice(1)) {
		const splitIndex = part.indexOf('=');
		if (splitIndex === -1) continue;
		const key = part.slice(0, splitIndex);
		const value = part.slice(splitIndex + 1);
		if (key === 't') timestamp = value;
		else if (key === 's') signature = value;
	}

	if (!/^[0-9]+$/.test(timestamp) || !/^[a-f0-9]+$/i.test(signature)) return false;

	const expected = createHmac('sha256', secret)
		.update(`v1.${timestamp}.${rawBody}`)
		.digest('hex');

	const expectedBuffer = Buffer.from(expected, 'hex');
	const actualBuffer = Buffer.from(signature, 'hex');
	return (
		expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
	);
}

export class CrispyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crispy Trigger',
		name: 'crispyTrigger',
		icon: 'file:crispy.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when a Crispy (LinkedIn) event happens',
		defaults: {
			name: 'Crispy Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'crispyApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Which Crispy events should trigger this workflow',
				options: EVENT_OPTIONS,
			},
			{
				displayName:
					'Crispy requires an HTTPS callback URL for webhooks. A plain-HTTP n8n install cannot activate this trigger — use n8n\u2019s HTTPS test-webhook tunnel (for testing) or put n8n behind HTTPS (for production).',
				name: 'httpsNotice',
				type: 'notice',
				default: '',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const staticData = this.getWorkflowStaticData('node') as CrispyTriggerStaticData;

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'crispyApi',
					{
						method: 'GET',
						url: `${CRISPY_BASE_URL}/api/v1/webhooks`,
						json: true,
					} as IHttpRequestOptions,
				);

				const existing = extractWebhookList(response).find((webhook) => {
					const webhookEvents = Array.isArray(webhook.events) ? (webhook.events as string[]) : [];
					return webhook.url === webhookUrl && setsEqual(webhookEvents, events);
				});

				if (existing) {
					staticData.webhookId = String(existing.id ?? existing.webhook_id ?? '');
					return Boolean(staticData.webhookId);
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not resolve the webhook URL');
				}

				if (webhookUrl.startsWith('http://')) {
					throw new NodeOperationError(
						this.getNode(),
						'Crispy only accepts HTTPS webhook URLs. Use an HTTPS n8n installation, or n8n\u2019s HTTPS test-webhook tunnel while testing, then reactivate this trigger.',
					);
				}

				const events = this.getNodeParameter('events') as string[];
				const staticData = this.getWorkflowStaticData('node') as CrispyTriggerStaticData;

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'crispyApi',
					{
						method: 'POST',
						url: `${CRISPY_BASE_URL}/api/v1/webhooks`,
						body: {
							url: webhookUrl,
							events,
							description: `n8n workflow: ${this.getWorkflow().name ?? this.getWorkflow().id}`,
						},
						json: true,
					} as IHttpRequestOptions,
				);

				const body = (response as IDataObject) ?? {};
				const webhookId = String(body.id ?? body.webhook_id ?? '');
				// Never log the signing secret — store it only in static workflow
				// data, which n8n persists encrypted alongside the workflow.
				const signingSecret = String(body.signing_secret ?? body.secret ?? '');

				if (!webhookId) {
					throw new NodeOperationError(
						this.getNode(),
						'Crispy did not return a webhook ID when creating the webhook subscription',
					);
				}

				staticData.webhookId = webhookId;
				if (signingSecret) {
					staticData.signingSecret = signingSecret;
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as CrispyTriggerStaticData;
				const webhookId = staticData.webhookId;

				if (!webhookId) {
					return true;
				}

				try {
					// Crispy's delete endpoint is confirm-token gated: the first call
					// (no confirm_token) returns HTTP 202 with { preview: true,
					// confirm_token, impact } instead of deleting anything — confirmed
					// directly against app/api/v1/webhooks/{id} via
					// lib/mcp/rest-executor.ts + tests/preview-rest-contract.test.ts
					// while building this node. The second call replays that token as
					// a query parameter to actually delete it.
					const preview = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'crispyApi',
						{
							method: 'DELETE',
							url: `${CRISPY_BASE_URL}/api/v1/webhooks/${webhookId}`,
							json: true,
						} as IHttpRequestOptions,
					)) as IDataObject;

					const confirmToken =
						(preview?.confirm_token as string | undefined) ??
						((preview?.data as IDataObject)?.confirm_token as string | undefined) ??
						((preview?.result as IDataObject)?.confirm_token as string | undefined);
					if (confirmToken) {
						await this.helpers.httpRequestWithAuthentication.call(this, 'crispyApi', {
							method: 'DELETE',
							url: `${CRISPY_BASE_URL}/api/v1/webhooks/${webhookId}`,
							qs: { confirm_token: confirmToken },
							json: true,
						} as IHttpRequestOptions);
					} else {
						this.logger.warn(
							`Crispy Trigger webhook ${webhookId}: no confirm_token was found in the delete preview response (checked top level, "data", and "result") — skipping the second confirm call. The webhook subscription may still exist on Crispy's side even though local webhook data was cleared.`,
						);
					}
				} catch (error) {
					// Deactivating a workflow should not hard-fail just because the
					// webhook was already removed upstream (for example manually
					// deleted from the Crispy dashboard).
					this.logger.warn(
						`Crispy Trigger could not confirm deletion of webhook ${webhookId}: ${
							(error as Error).message
						}`,
					);
				}

				delete staticData.webhookId;
				delete staticData.signingSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const staticData = this.getWorkflowStaticData('node') as CrispyTriggerStaticData;
		const secret = staticData.signingSecret;
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const signatureHeader = (headerData['webhook-signature'] as string | undefined) ?? undefined;

		if (secret) {
			const rawBody: string | undefined = (req as unknown as { rawBody?: Buffer }).rawBody
				? (req as unknown as { rawBody: Buffer }).rawBody.toString('utf8')
				: undefined;

			if (!rawBody || !verifyWebhookSignatureV1(rawBody, signatureHeader, secret)) {
				const res = this.getResponseObject();
				res.status(401).send('Unauthorized').end();
				return { noWebhookResponse: true };
			}
		} else {
			this.logger.warn(
				'Crispy Trigger has no stored signing secret for this webhook (it may have been created before this version, or static data was reset) — rejecting this delivery because the signature cannot be verified. Deactivate and reactivate the trigger to get a verifiable secret.',
			);
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}

		const bodyData = this.getBodyData() as IDataObject;
		const events = this.getNodeParameter('events') as string[];
		const eventName = bodyData.event as string | undefined;

		if (eventName && events.length > 0 && !events.includes(eventName)) {
			// Defensive filter: Crispy should only deliver subscribed events, but
			// don't emit workflow data for an unexpected event type.
			return { noWebhookResponse: false, workflowData: [] };
		}

		return {
			workflowData: [this.helpers.returnJsonArray([bodyData])],
		};
	}
}
