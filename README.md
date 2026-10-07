# Pingstar AI — client-ready optician platform demo

Pingstar is a practice platform demo for independent opticians. The visible product focuses on:

- customer records and editable clinical/customer notes;
- customer photos;
- optometrist calendar and appointment booking;
- appointment history;
- practice mailbox;
- internal AI practice assistant;
- missed-call recovery using Twilio;
- customer-facing AI booking and enquiry chatbot;
- live connection screens for Twilio, Microsoft 365 and Google Workspace.

Products & Sales, generic Automations, Plans and Pricing are not shown in the visible application or customer website.

## Main files

- `index.html` — Pingstar staff/practice application.
- `website.html` — customer-facing website with AI appointment self-service.
- `server.mjs` — Node.js server for OpenAI, Twilio and mailbox APIs.
- `website.css` — customer website theme.
- `styles.css` — staff application theme.
- `PINGSTAR_FULL_SETUP.md` — complete implementation order.
- `LIVE_AI_SETUP.md` — OpenAI connection.
- `TWILIO_SETUP.md` — missed-call and SMS recovery.
- `MAILBOX_INTEGRATION_SETUP.md` — Microsoft 365 and Gmail connection.

## Mac local demo

Staff app:

```text
start-local-demo-mac-linux.command
```

Customer website:

```text
start-website-demo-mac.command
```

## Mac live integrations

1. Run `setup-live-ai-mac.command` once.
2. Add the required settings to `.env`.
3. Run `start-missed-call-live-mac.command` or `start-live-ai-mac.command`.
4. Open `http://localhost:8765`.
5. Open the **Connections** page in Pingstar.
6. The customer website is at `http://localhost:8765/website.html`.

For Twilio and production OAuth callbacks, Pingstar must be deployed to a public HTTPS URL.

## Important

All bundled customer data is fictional. The demo stores mailbox OAuth tokens in a local `.mail-connection.json` file and stores much of the demo data in browser local storage. Before using real patient or customer data, move data and tokens to encrypted tenant-specific server storage and add authentication, MFA, role-based access, audit logging, backups, retention/deletion controls and a security/privacy review.
