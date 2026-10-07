# Pingstar — connect a client's Microsoft 365 or Gmail mailbox

Pingstar uses server-side OAuth. The browser never stores the Microsoft/Google client secret or mailbox refresh token.

Current demo behaviour:

```text
Pingstar browser
      ↓
/api/mail/...
      ↓
Pingstar Node server
      ↓ OAuth access token
Microsoft Graph or Gmail API
      ↓
Client mailbox
```

The demo supports one connected mailbox per running Pingstar instance. For multiple practices, move OAuth tokens into encrypted per-tenant database storage.

# Option 1 — Microsoft 365 / Outlook

## A. Create the Microsoft Entra application

### 1. Sign in to the client's Microsoft Entra admin centre

Use an account allowed to create app registrations for the client's tenant.

### 2. Create an app registration

Go to:

```text
Identity → Applications → App registrations → New registration
```

Set:

- **Name:** `Pingstar Mail Connector`
- **Supported account types:** for one client tenant, choose accounts in this organisational directory only.

Select **Register**.

### 3. Copy the IDs

On the app Overview page copy:

- **Application (client) ID**
- **Directory (tenant) ID**

You will add both to Pingstar `.env`.

## B. Add the redirect URLs

### 4. Open Authentication

Inside the app registration:

```text
Manage → Authentication
```

### 5. Add a Web platform

Choose:

```text
Add a platform → Web
```

For production add:

```text
https://app.yourdomain.co.uk/api/mail/microsoft/callback
```

For local development you can also add:

```text
http://localhost:8765/api/mail/microsoft/callback
```

The production callback in Microsoft must exactly match `MICROSOFT_REDIRECT_URI` in Pingstar.

Do not configure this backend OAuth flow as an SPA redirect.

## C. Add Microsoft Graph permissions

### 6. Open API permissions

Go to:

```text
Manage → API permissions → Add a permission
```

Choose:

```text
Microsoft Graph → Delegated permissions
```

Add:

```text
User.Read
Mail.ReadWrite
Mail.Send
```

Pingstar also requests the standard OAuth/OpenID scopes `openid`, `profile`, `email` and `offline_access` during sign-in so it can identify the account and refresh access tokens.

### 7. Grant consent

If the client's tenant policy requires administrator approval, select:

```text
Grant admin consent for <tenant>
```

A tenant administrator may need to approve this.

## D. Create the client credential

### 8. Create a client secret

Go to:

```text
Manage → Certificates & secrets → Client secrets → New client secret
```

Use a description such as:

```text
Pingstar production server
```

Choose an expiry period that matches the client's credential-rotation policy.

Select **Add**.

### 9. Copy the secret VALUE immediately

Copy the **Value**, not the Secret ID. Microsoft only shows the full secret value once.

## E. Configure Pingstar

### 10. Add the Microsoft values to `.env`

```env
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=the_client_secret_value
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=https://app.yourdomain.co.uk/api/mail/microsoft/callback
```

Use the real tenant ID rather than `common` for a single-client production deployment.

### 11. Restart Pingstar

```bash
npm start
```

If the server is managed by a hosting platform, restart/redeploy the service after changing environment variables.

## F. Connect the mailbox in Pingstar

### 12. Open Pingstar

Go to:

```text
https://app.yourdomain.co.uk
```

### 13. Open Connections

Select:

```text
Connections → Microsoft 365
```

The button opens:

```text
/api/mail/microsoft/connect
```

### 14. Sign in as the mailbox user

Use the actual Microsoft 365 mailbox account Pingstar should read and send as.

Microsoft displays the requested permissions. Approve them.

### 15. Confirm the callback

Microsoft redirects to:

```text
https://app.yourdomain.co.uk/api/mail/microsoft/callback
```

Pingstar exchanges the authorization code for access/refresh tokens and redirects back to the main app.

### 16. Check connection status

Open:

```text
https://app.yourdomain.co.uk/api/mail/status
```

You should see a response containing:

```json
{
  "connected": true,
  "provider": "microsoft"
}
```

### 17. Sync messages

In Pingstar:

```text
Mailbox → Sync mailbox
```

Pingstar loads recent Inbox and Sent messages from Microsoft Graph.

### 18. Send a test message

In Pingstar compose a message to a safe test address and send it.

Pingstar sends through Microsoft Graph using:

```text
POST /me/sendMail
```

Then confirm the message appears in the Microsoft 365 mailbox's Sent Items.

## Microsoft shared mailbox note

The included build connects to the signed-in user's primary mailbox using `/me`. If the client's real reception address is an Exchange shared mailbox rather than a normal user mailbox, the production connector should be extended to target `/users/{shared-mailbox-address}` and use the appropriate delegated shared-mail permissions and Exchange Send As/Send on Behalf rights. Do not assume a shared mailbox will behave like the signed-in user's primary mailbox without this change.

# Option 2 — Google Workspace / Gmail

## A. Create the Google Cloud project

### 1. Open Google Cloud Console

Sign in with an administrator/developer account for the client.

### 2. Create or select a project

Create a project such as:

```text
Pingstar Mail Connector
```

## B. Enable Gmail API

### 3. Enable Gmail API

Go to:

```text
APIs & Services → Library
```

Search for:

```text
Gmail API
```

Open it and select **Enable**.

## C. Configure Google Auth Platform

### 4. Open Google Auth Platform

Go to:

```text
Google Auth platform → Branding
```

If it is not configured, select **Get Started**.

Set the application name to:

```text
Pingstar
```

Add the support/contact information required by Google.

### 5. Configure Audience

If the Pingstar OAuth app is created inside the same Google Workspace organisation and only that organisation will use it, choose an internal audience when available.

If users outside that Workspace organisation will connect, configure the app for external users. While the app is in Testing, add the mailbox account as a test user.

### 6. Configure Data Access

Pingstar currently requests:

```text
openid
email
https://www.googleapis.com/auth/gmail.modify
```

`gmail.modify` allows Pingstar to read mail, modify mailbox state and send mail for the consenting account. Request only the access you actually need.

## D. Create the OAuth Web client

### 7. Open Clients

Go to:

```text
Google Auth platform → Clients
```

Select:

```text
Create Client
```

### 8. Choose Web application

Set:

```text
Application type: Web application
Name: Pingstar Web Server
```

### 9. Add the authorised redirect URI

For production:

```text
https://app.yourdomain.co.uk/api/mail/google/callback
```

For local testing you can also add:

```text
http://localhost:8765/api/mail/google/callback
```

The redirect URI must exactly match what Pingstar sends, including `http`/`https`, hostname, port and path.

### 10. Create the client

Copy:

- Client ID
- Client secret

## E. Configure Pingstar

### 11. Add Google values to `.env`

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://app.yourdomain.co.uk/api/mail/google/callback
```

### 12. Restart Pingstar

```bash
npm start
```

## F. Connect Gmail in Pingstar

### 13. Open Pingstar

```text
https://app.yourdomain.co.uk
```

### 14. Open Connections

Select:

```text
Connections → Google Workspace
```

Pingstar opens:

```text
/api/mail/google/connect
```

### 15. Sign in to the client practice mailbox

Use the Gmail/Google Workspace account Pingstar should handle.

Approve the OAuth request.

### 16. Google redirects back to Pingstar

Callback:

```text
https://app.yourdomain.co.uk/api/mail/google/callback
```

Pingstar exchanges the authorization code for access and refresh tokens.

### 17. Verify connection

Open:

```text
https://app.yourdomain.co.uk/api/mail/status
```

Expected fields include:

```json
{
  "connected": true,
  "provider": "google"
}
```

### 18. Sync Gmail

In Pingstar:

```text
Mailbox → Sync mailbox
```

Pingstar downloads recent Inbox and Sent messages using the Gmail API.

### 19. Send a test email

Compose a test email in Pingstar and send it.

Pingstar calls Gmail's message-send endpoint using the connected user's OAuth token. Verify the email appears in Gmail Sent.

## G. Google production verification

For a private test/internal deployment, Google may allow testing without a fully published external app. For a public SaaS, Gmail scopes can trigger OAuth verification requirements; if restricted user data is stored or transmitted through your servers, additional security-assessment requirements may apply. Plan this before onboarding external Google Workspace clients.

# Disconnecting a mailbox

Pingstar exposes:

```text
POST /api/mail/disconnect
```

The **Disconnect** button removes the local demo token file.

# Current demo token storage

The demo stores the connection in:

```text
.mail-connection.json
```

Do not use that approach for a multi-client production SaaS.

Production should store encrypted OAuth tokens per practice tenant in a database or secret-management service. Also add:

- staff authentication and MFA;
- tenant isolation;
- role-based mailbox permissions;
- audit logs for message reads and sends;
- token rotation and revocation;
- encryption at rest and in transit;
- retention and deletion controls;
- monitoring and rate limits.
