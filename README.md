# n8n-nodes-crispy

This is an n8n community node package for [Crispy](https://crispy.sh), the
LinkedIn automation API. It lets you search people, read profiles, manage
contacts and lists, run outreach campaigns, read and send inbox messages,
send connection requests, and react to real-time Crispy webhook events —
all from an n8n workflow.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Credentials](#credentials)
[Nodes](#nodes)
[Operations](#operations)
[Webhook signature verification](#webhook-signature-verification)
[Example workflows](#example-workflows)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
in the n8n community nodes documentation, and install `n8n-nodes-crispy`.

## Credentials

This package uses a single credential type, **Crispy API**, with one field:

- **API Key** — a Crispy API key (starts with `crispy_`), sent as
  `Authorization: Bearer <key>` on every request.

To get a key:

1. [Create a Crispy account](https://crispy.sh/signup) if you don't have one.
2. [Connect your LinkedIn profile](https://crispy.sh/help/connect-linkedin).
3. Generate an API key from your Crispy dashboard settings (shown once,
   during onboarding or from your account settings — see the
   [Crispy docs "Before you start" section](https://crispy.sh/docs#before-you-start)
   for the current steps; this package could not confirm the exact dashboard
   URL path for an already-created account without signing in, see
   "What I did not investigate" in the build report for this package).
4. Make sure the key's permission scope includes the tools you need. Webhook
   management (used by Crispy Trigger) requires the `full_access` scope —
   see [Crispy's permission scopes docs](https://crispy.sh/docs/concepts#permission-scopes).

## Nodes

This package ships two nodes:

- **Crispy** — an action node to call the Crispy REST API
  (`https://crispy.sh/api/v1/...`).
- **Crispy Trigger** — a webhook-based trigger node that starts a workflow
  when a Crispy/LinkedIn event happens (new message, invitation accepted,
  and so on).

## Operations

### Crispy (action node)

| Resource | Operation | Description |
|---|---|---|
| Account | Get | Get the LinkedIn account connected to this API key |
| Person | Search | Search LinkedIn people by keyword and filters |
| Profile | Get | Get a single LinkedIn profile by provider ID, slug, or URL |
| Contact | Get Many | Get your Crispy contacts (CRM-enriched LinkedIn connections) |
| List | Get Many | Get your Crispy contact/account lists |
| List | Get Contacts | Get the contacts that belong to a list |
| List | Add Contact | Add an existing contact to a list (does not message anyone) |
| Campaign | Get Many | Get your outreach campaigns |
| Campaign | Get | Get a single campaign by ID |
| Campaign | Get Stats | Get performance statistics for a campaign |
| Conversation | Get Many | Get your inbox conversations |
| Conversation | Get Messages | Get the messages in a conversation |
| Conversation | Send Message | Send a LinkedIn message in an existing conversation |
| Invitation | Send | Send a LinkedIn connection request |

**Sends a real LinkedIn message or connection request when executed for
real:** Conversation → Send Message, and Invitation → Send. Crispy applies
daily limits to both to protect your LinkedIn account — see
[Crispy's safety-limit docs](https://crispy.sh/docs/concepts#linkedin-safety-limits)
for the current defaults.

Several "read many"/"get" operations expose a **Simplify** toggle (default
on) that trims the response to its first 10 top-level fields; turn it off to
get the full raw response. Contact → Get Many can return either JSON or a
CSV file body (controlled by its Format field) — the raw response body is
returned either way, it is never force-parsed as JSON.

List → Add Contact, Campaign → Get/Get Stats, and Conversation → Get
Messages/Send Message let you pick their list/campaign/conversation from a
searchable list (backed by the matching "Get Many" call) or type an ID
directly.

### Crispy Trigger

A single trigger node, configurable with any combination of:

- `message.received` — a message arrived in a conversation (this fires for
  both inbound replies and the account owner's own outbound sends relayed by
  LinkedIn — check the delivered item's `direction`/`is_sender` field before
  treating it as an incoming reply)
- `invitation.received` — a new connection request arrived
- `invitation.accepted` — someone accepted a connection request sent via Crispy
- `campaign.completed` — an outreach campaign finished running
- `account.disconnected` — the connected LinkedIn account was disconnected

On activation, the node registers (or reuses) a webhook subscription with
Crispy and stores its ID and signing secret in the workflow's static data
(the secret is never logged). On deactivation, it deletes that webhook.
**Crispy requires an HTTPS callback URL** — a plain-HTTP n8n install cannot
activate this trigger; use n8n's HTTPS test-webhook tunnel while testing, or
run n8n behind HTTPS in production.

## Webhook signature verification

Every delivery is verified before any workflow data is emitted. Per
[Crispy's webhooks guide](https://crispy.sh/docs/guides/webhooks)
("Signature verification (v1)"): Crispy signs the literal string
`v1.<timestamp>.<rawBody>` with the webhook's signing secret using
HMAC-SHA256, and sends the result as a single header:

```
Webhook-Signature: v1,t=<timestamp>,s=<hex_digest>
```

There is no separate timestamp header — the timestamp lives inside the
`t=` field of `Webhook-Signature` itself. This node implements that exact
scheme (confirmed against Crispy's own published documentation while
building this package). It was **not** exercised against a real inbound
delivery during this build — see "What I did not investigate" in the build
report for details. If your deliveries are ever rejected as unauthorized,
double-check you are not running an older Crispy webhook created with
`signing_format: "legacy"`, which uses a different header set
(`X-Crispy-Signature`, `X-Crispy-Timestamp`, `X-Crispy-Delivery-Id`) that
this node does not support — recreate the webhook (deactivate and
reactivate this trigger) to get a v1 webhook.

## Example workflows

Two example workflow exports live in [`examples/`](./examples), with all
example data (names, IDs, message text) literally labelled `EXAMPLE` — never
real values:

1. [`crispy-trigger-reply-to-message.json`](./examples/crispy-trigger-reply-to-message.json) —
   Crispy Trigger (`message.received`) → IF (only inbound messages) →
   Crispy "Send Message" with placeholder reply text.
2. [`person-search-to-list.json`](./examples/person-search-to-list.json) —
   Crispy "Person Search" with a placeholder keyword → Crispy "List Add
   Contact" against a placeholder list ID.

Import either file from n8n's workflow editor (**Import from File**).

## Compatibility

Built and tested against `@n8n/node-cli` 0.55.x and a locally-run n8n
instance (`n8n-node dev`, n8n served at `http://localhost:5678`). No
version-specific incompatibilities are known for n8n's current community
node API (`n8nNodesApiVersion: 1`).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Crispy docs](https://crispy.sh/docs)
- [Crispy API reference](https://crispy.sh/docs/reference)
- [Crispy webhooks guide](https://crispy.sh/docs/guides/webhooks)

## Version history

- **0.1.0** — Initial release: Crispy action node (Account, Person, Profile,
  Contact, List, Campaign, Conversation, Invitation resources) and Crispy
  Trigger (5 events, webhook lifecycle, v1 signature verification).
