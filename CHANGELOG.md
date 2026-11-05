## 0.1.0

Initial release.

- **Crispy node**: search people, manage contacts (JSON or CSV export),
  lists, campaigns, and inbox conversations (get, get messages, send
  messages with text, voice notes, and attachments) against the Crispy
  LinkedIn automation API.
- **Crispy Trigger node**: webhook trigger for Crispy events (account
  disconnected, campaign completed, invitation accepted/received, message
  received), with HMAC-SHA256 v1 signature verification and automatic
  webhook subscription lifecycle management (create/check/delete).
- **Crispy API credential**: API-key authentication against the Crispy API.
