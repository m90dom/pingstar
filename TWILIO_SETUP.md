# Pingstar — Twilio missed-call SMS recovery setup

## Goal

Keep the client's existing office number. Staff answer calls as normal. If the call is not answered or is busy, the existing phone provider forwards that missed call to a Twilio voice number. Twilio sends the call to Pingstar. Pingstar reads the original caller number and automatically sends an SMS containing the customer chatbot booking link.

The flow is:

```text
Customer calls existing practice number
        ↓
Practice phone rings normally
        ↓ no answer / busy
Existing carrier or PBX conditionally forwards call
        ↓
Twilio voice number
        ↓ webhook
Pingstar /api/webhooks/twilio/incoming-call
        ↓
Twilio SMS / Messaging Service
        ↓
Customer receives Pingstar booking link
        ↓
website.html?chat=open&action=book&source=missed-call...
        ↓
Customer books or asks a question
```

# Part A — Prepare Pingstar

## 1. Deploy Pingstar to HTTPS

Twilio cannot use `localhost` as a production webhook. Deploy the Pingstar Node app to a public HTTPS address. Example used below:

```text
https://app.yourdomain.co.uk
```

Replace this example with the real Pingstar URL everywhere.

## 2. Run the live Node build

On the server, install packages and start Pingstar:

```bash
npm install
npm start
```

## 3. Open `.env`

For the existing-number recovery design, set:

```env
PUBLIC_BASE_URL=https://app.yourdomain.co.uk
PRACTICE_NAME=Your Client Opticians
TWILIO_CALL_MODE=recovery-only
PRACTICE_FORWARD_NUMBER=

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+44xxxxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_VALIDATE_WEBHOOKS=true

MISSED_CALL_DEDUPE_MINUTES=15
```

Use either `TWILIO_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` for outbound SMS. If you use a Messaging Service, you can leave `TWILIO_PHONE_NUMBER` blank as long as the service has an appropriate sender.

Restart Pingstar whenever `.env` changes.

# Part B — Create the Twilio voice destination

## 4. Create or sign in to the Twilio account

Use a Twilio project dedicated to the client or to the Pingstar service, depending on your tenancy model.

## 5. Buy a Twilio number that can receive voice

In Twilio Console:

1. Open **Phone Numbers**.
2. Open **Manage**.
3. Open **Buy a number**.
4. Choose the correct country.
5. Filter for **Voice** capability.
6. Buy the number.
7. Copy the number in international/E.164 format, for example `+44...`.

This is the number the client's existing office number will divert to when a call is missed.

## 6. Decide how Pingstar will send SMS

Option 1 — use an SMS-capable Twilio number:

```env
TWILIO_PHONE_NUMBER=+44your_sms_capable_twilio_number
TWILIO_MESSAGING_SERVICE_SID=
```

Option 2 — use a Twilio Messaging Service:

1. In Twilio Console open **Messaging → Services**.
2. Select **Create Messaging Service**.
3. Give it a name such as `Pingstar Missed Call Recovery`.
4. Select the appropriate messaging use case.
5. Add an SMS-capable sender to the Sender Pool.
6. Copy the Messaging Service SID beginning with `MG`.
7. Set:

```env
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

A Twilio voice number and the outbound SMS sender do not have to be the same number.

# Part C — Configure Twilio Voice

## 7. Open the Twilio voice number

In Twilio Console:

1. Go to **Phone Numbers → Manage → Active numbers**.
2. Select the number that receives the diverted missed calls.
3. Find **Voice configuration**.
4. For **A call comes in**, choose **Webhook**.
5. Set the HTTP method to **POST**.
6. Enter:

```text
https://app.yourdomain.co.uk/api/webhooks/twilio/incoming-call
```

7. Save the number configuration.

## 8. Keep Pingstar in recovery-only mode

For an existing office number that rings before Twilio, use:

```env
TWILIO_CALL_MODE=recovery-only
PRACTICE_FORWARD_NUMBER=
```

Do not put the office number into `PRACTICE_FORWARD_NUMBER` in this mode. The office number has already rung. Forwarding it back from Twilio can create a loop.

# Part D — Configure the client's existing office number

## 9. For a local landline or VoIP number

Contact the client's carrier or PBX administrator and request:

- conditional call forwarding/diversion on **No Answer** to the Twilio voice number;
- conditional call forwarding/diversion on **Busy** to the same Twilio number if desired;
- a reasonable no-answer timer, for example 20–30 seconds;
- preservation of the **original caller ID / CLI / ANI** on the forwarded call.

The last requirement is critical. Pingstar needs the original caller's number. If the carrier presents only the practice number when it forwards the call, Pingstar cannot know which customer to text.

For a cloud PBX, this is normally configured as a no-answer/busy route to an external telephone number. The exact menu name differs between PBX vendors.

## 10. For a mobile office number

Do not use ordinary unconditional call forwarding if you want staff to have the opportunity to answer first.

Use the mobile carrier's call-forwarding settings, app, support team or supplementary-service configuration to set:

- **Forward when unanswered** → Twilio voice number;
- optionally **Forward when busy** → Twilio voice number;
- optionally **Forward when unreachable** → Twilio voice number.

Then test that the forwarded call still presents the original caller's mobile number to Twilio. Carrier behaviour varies, so this must be tested on the actual client's SIM/network.

# Part E — Verify Pingstar and Twilio

## 11. Check Pingstar health

Open:

```text
https://app.yourdomain.co.uk/api/health
```

Confirm the response shows:

- `smsConfigured: true`
- `smsProvider: "Twilio"`
- `twilioCallMode: "recovery-only"`
- the correct `publicBaseUrl`

## 12. Test an answered call

1. Call the client's normal office number from a separate mobile.
2. Answer at the practice.
3. Confirm the call does not divert to Twilio.
4. Confirm Pingstar does not send a missed-call SMS.

## 13. Test a missed call

1. Call the normal office number from a mobile whose number is visible.
2. Do not answer.
3. Wait for the carrier to divert the call to the Twilio number.
4. Twilio sends the call details to Pingstar.
5. Pingstar sends the caller an SMS.
6. The SMS should contain a URL similar to:

```text
https://app.yourdomain.co.uk/website.html?chat=open&action=book&source=missed-call&ref=MC-...
```

7. Tap the link.
8. Confirm the Pingstar customer chatbot opens directly into the booking journey.
9. Complete a fictional booking.
10. In the Pingstar staff app open **Missed Calls** and confirm the journey progresses from SMS sent/delivered to opened/booked.

## 14. Test busy handling

If the carrier has busy forwarding enabled:

1. Put the office line in use.
2. Call it from another phone.
3. Confirm the busy call diverts to Twilio.
4. Confirm the SMS is sent.

## 15. Test SMS delivery tracking

Pingstar sets a Twilio status callback automatically when it creates the SMS:

```text
https://app.yourdomain.co.uk/api/webhooks/twilio/sms-status
```

Twilio posts message status changes to this endpoint and Pingstar updates the missed-call record.

# Part F — Turn on webhook validation

## 16. Validate Twilio signatures

Once the public URL is final and working, keep:

```env
TWILIO_VALIDATE_WEBHOOKS=true
```

Pingstar validates Twilio's `X-Twilio-Signature` using the Twilio Auth Token. The public URL seen by Pingstar must exactly match the URL Twilio signs.

# Part G — If conditional forwarding does not preserve caller ID

You have three alternatives.

### Alternative 1 — PBX webhook

If the client's phone/PBX platform can send a missed-call event directly, post JSON to:

```text
POST https://app.yourdomain.co.uk/api/webhooks/missed-call
```

Example:

```json
{
  "from": "+447700900123",
  "status": "no-answer",
  "callId": "abc-123",
  "provider": "Client PBX"
}
```

If `MISSED_CALL_WEBHOOK_SECRET` is configured, send it as:

```text
X-Pingstar-Webhook-Secret: your_secret
```

This avoids relying on telephone forwarding to preserve CLI.

### Alternative 2 — Port the existing number to Twilio

If the number is portable, Twilio can become the carrier for the existing customer-facing number. Pingstar can then receive every call first and forward answered calls to staff.

Use:

```env
TWILIO_CALL_MODE=front-door
PRACTICE_FORWARD_NUMBER=+44number_staff_should_answer
```

Configure the Twilio number's Voice webhook to the same Pingstar incoming-call endpoint. Pingstar uses Twilio `<Dial>` to ring the practice and sends the SMS only when the dial result is `no-answer`, `busy`, `failed` or `canceled`.

### Alternative 3 — Use the phone-system vendor API

For a modern UC/PBX provider, use its missed-call webhook/API to call Pingstar's generic `/api/webhooks/missed-call` endpoint.

# Production checklist

- Public HTTPS Pingstar URL.
- Twilio webhook validation enabled.
- Original caller ID verified end-to-end.
- SMS sender and destination-country compliance checked.
- STOP/opt-out handling and privacy wording designed for the client's messaging policy.
- Missed-call records stored persistently in a database rather than memory.
- Rate limits and abuse controls added.
- Monitoring for failed/undelivered SMS.
