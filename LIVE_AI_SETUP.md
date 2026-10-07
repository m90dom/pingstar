# Pingstar AI — live OpenAI setup on Mac

This connects both the internal Pingstar practice copilot and the public customer website assistant to the OpenAI API.

## 1. Open the Pingstar folder

Unzip `pingstar.zip`, then open Terminal and move into the folder. Example:

```bash
cd ~/Downloads/pingstar
```

## 2. Check Node.js

Run:

```bash
node -v
npm -v
```

If either command is missing, install the current Node.js LTS release, then reopen Terminal and run the commands again.

## 3. Run the Pingstar setup script

From the Pingstar folder:

```bash
chmod +x setup-live-ai-mac.command
./setup-live-ai-mac.command
```

The script runs `npm install`, creates `.env` from `.env.example` if it does not already exist, and opens `.env` in TextEdit.

## 4. Create an OpenAI API key

Create a server-side API key in the OpenAI API platform. Do not put the key in `index.html`, `website.html`, JavaScript files or browser storage.

## 5. Configure `.env`

Set:

```env
OPENAI_API_KEY=your_real_openai_api_key
OPENAI_MODEL=gpt-6-sol
PORT=8765
PUBLIC_BASE_URL=http://localhost:8765
```

Save `.env`.

## 6. Start Pingstar

Run:

```bash
chmod +x start-live-ai-mac.command
./start-live-ai-mac.command
```

The staff app opens at:

```text
http://localhost:8765
```

The customer website is:

```text
http://localhost:8765/website.html
```

## 7. Check the live AI connection

Open:

```text
http://localhost:8765/api/health
```

A configured server returns JSON containing:

```json
{
  "ok": true,
  "aiConfigured": true,
  "model": "gpt-6-sol"
}
```

## 8. Test the internal assistant

Open Pingstar → **AI Chatbot** and ask:

```text
Give me today's practice briefing.
```

The status should show a live AI connection rather than local fallback.

## 9. Test the public website assistant

Open:

```text
http://localhost:8765/website.html
```

Open the customer chatbot and ask:

```text
What appointments can I book?
```

Then run through the booking flow using fictional details.

## 10. Production deployment

When Pingstar is deployed to a live HTTPS domain, change:

```env
PUBLIC_BASE_URL=https://your-live-pingstar-domain.example
```

Then restart the Node server. Twilio and OAuth callback URLs must use this exact public HTTPS origin.

## How Pingstar uses OpenAI

- Internal staff assistant: `POST /api/chat`
- Public website assistant: `POST /api/public-chat`
- The OpenAI secret key is stored only in `.env` on the server.
- The public endpoint is isolated from the internal fictional customer dataset.
- The public assistant is instructed not to diagnose or disclose staff-only/customer data.
