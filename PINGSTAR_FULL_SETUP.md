# Pingstar — complete implementation order

Use this order when turning the demo into a live client implementation.

## Phase 1 — Start Pingstar locally on Mac

1. Unzip `pingstar.zip`.
2. Open Terminal.
3. Run:

```bash
cd ~/Downloads/pingstar
chmod +x setup-live-ai-mac.command
./setup-live-ai-mac.command
```

4. Add your OpenAI key to `.env`.
5. Run:

```bash
./start-live-ai-mac.command
```

6. Open `http://localhost:8765`.
7. Open `http://localhost:8765/website.html`.
8. Open `http://localhost:8765/api/health` and confirm `aiConfigured` is `true`.

## Phase 2 — Deploy Pingstar to a public HTTPS address

1. Deploy the folder on a Node.js-capable host.
2. Run `npm install` during build/deployment.
3. Run `npm start` as the start command.
4. Configure the host to expose the port supplied by `PORT`.
5. Attach a public HTTPS domain, for example `https://app.yourdomain.co.uk`.
6. Set `PUBLIC_BASE_URL` to that exact HTTPS origin.
7. Restart the service.
8. Confirm `https://app.yourdomain.co.uk/api/health` works publicly.

## Phase 3 — Connect OpenAI

Set:

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-6-sol
```

Restart Pingstar and test both `/api/chat` and the public website chatbot.

See `LIVE_AI_SETUP.md`.

## Phase 4 — Configure Twilio missed-call recovery

1. Buy/configure a Twilio Voice number.
2. Configure an SMS-capable Twilio sender or Messaging Service.
3. Add Twilio credentials to `.env`.
4. Set `TWILIO_CALL_MODE=recovery-only`.
5. Set the Twilio Voice webhook to `/api/webhooks/twilio/incoming-call`.
6. Configure the client's existing office carrier/PBX to forward no-answer/busy calls to the Twilio Voice number.
7. Confirm original caller ID is preserved.
8. Test the SMS booking link end-to-end.

See `TWILIO_SETUP.md`.

## Phase 5 — Connect the client mailbox

Choose one provider.

### Microsoft 365

1. Create a Microsoft Entra app registration.
2. Add the Pingstar Microsoft callback URL.
3. Add Graph delegated `User.Read`, `Mail.ReadWrite`, `Mail.Send` permissions.
4. Create a server-side credential.
5. Add IDs/secret/redirect URI to `.env`.
6. Restart Pingstar.
7. Use **Connections → Microsoft 365**.
8. Sync and send a test email.

### Gmail

1. Create/select a Google Cloud project.
2. Enable Gmail API.
3. Configure Google Auth Platform branding/audience/data access.
4. Create a Web OAuth client.
5. Add Pingstar's Google callback URI.
6. Add client ID/secret/redirect URI to `.env`.
7. Restart Pingstar.
8. Use **Connections → Google Workspace**.
9. Sync and send a test email.

See `MAILBOX_INTEGRATION_SETUP.md`.

## Phase 6 — Production data/security changes

Before onboarding real optical records:

1. Replace browser local storage with a server database.
2. Replace `.mail-connection.json` with encrypted per-tenant token storage.
3. Add practice tenant IDs to all records.
4. Add staff sign-in, MFA and role-based access.
5. Add immutable audit logs for customer, clinical and mailbox access.
6. Encrypt data at rest and in transit.
7. Add backups and tested recovery.
8. Add retention, deletion and customer-subject-right workflows.
9. Add rate limits and abuse controls to public chatbot, mail and webhook endpoints.
10. Add monitoring/alerts for failed Twilio SMS, API failures and OAuth expiry/revocation.
11. Complete privacy, data-processing and clinical-safety reviews before using live health information.
