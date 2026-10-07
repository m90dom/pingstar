import express from "express";
import OpenAI from "openai";
import twilio from "twilio";
import dotenv from "dotenv";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8765);
const MODEL = process.env.OPENAI_MODEL || "gpt-6-sol";
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const PRACTICE_NAME = process.env.PRACTICE_NAME || "ClearView Opticians";
const PRACTICE_FORWARD_NUMBER = normalisePhone(process.env.PRACTICE_FORWARD_NUMBER || "");
const TWILIO_CALL_MODE = String(process.env.TWILIO_CALL_MODE || "recovery-only").trim().toLowerCase();
const MISSED_CALL_WEBHOOK_SECRET = String(process.env.MISSED_CALL_WEBHOOK_SECRET || "").trim();
const DEDUPE_MINUTES = Math.max(1, Number(process.env.MISSED_CALL_DEDUPE_MINUTES || 15));

const apiKey = process.env.OPENAI_API_KEY?.trim();
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const twilioAccountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
const twilioAuthToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
const twilioPhoneNumber = normalisePhone(process.env.TWILIO_PHONE_NUMBER || "");
const twilioMessagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || "").trim();
const validateTwilioWebhooks = String(process.env.TWILIO_VALIDATE_WEBHOOKS || "false").toLowerCase() === "true";
const twilioClient = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;
const smsConfigured = Boolean(twilioClient && (twilioPhoneNumber || twilioMessagingServiceSid));

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname, { extensions: ["html"] }));

const missedCalls = [];

function normalisePhone(value) {
  const raw = String(value || "").trim().replace(/[()\s-]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return `+${raw.slice(1).replace(/\D/g, "")}`;
  if (raw.startsWith("00")) return `+${raw.slice(2).replace(/\D/g, "")}`;
  if (raw.startsWith("0")) return `+44${raw.slice(1).replace(/\D/g, "")}`;
  return `+${raw.replace(/\D/g, "")}`;
}

function safeText(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function xml(value) {
  return String(value || "").replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[character]));
}

function bookingUrl(id) {
  const url = new URL("/website.html", PUBLIC_BASE_URL);
  url.searchParams.set("chat", "open");
  url.searchParams.set("action", "book");
  url.searchParams.set("source", "missed-call");
  url.searchParams.set("ref", id);
  return url.toString();
}

function findMissedCall(id) {
  return missedCalls.find(record => record.id === id);
}

function findRecentByPhone(phone) {
  const threshold = Date.now() - DEDUPE_MINUTES * 60_000;
  return missedCalls.find(record => record.phone === phone && new Date(record.callAt).getTime() >= threshold);
}

function upsertMissedCall(record) {
  const index = missedCalls.findIndex(item => item.id === record.id);
  if (index >= 0) missedCalls[index] = { ...missedCalls[index], ...record };
  else missedCalls.unshift(record);
  return index >= 0 ? missedCalls[index] : record;
}

function smsBody(record) {
  return `Sorry we missed your call to ${PRACTICE_NAME}. Book an appointment or ask our optical assistant a question here: ${record.bookingUrl} Reply STOP to opt out.`;
}

async function sendRecoverySms(record, { real = true } = {}) {
  record.smsSentAt = new Date().toISOString();
  record.smsBody = smsBody(record);

  if (!real || !smsConfigured) {
    record.smsStatus = real ? "simulated" : "delivered";
    record.mode = "simulated";
    record.outcome = real ? "Needs review" : "Delivered";
    return record;
  }

  const messageOptions = {
    to: record.phone,
    body: record.smsBody,
    statusCallback: `${PUBLIC_BASE_URL}/api/webhooks/twilio/sms-status`,
  };
  if (twilioMessagingServiceSid) messageOptions.messagingServiceSid = twilioMessagingServiceSid;
  else messageOptions.from = twilioPhoneNumber;

  const message = await twilioClient.messages.create(messageOptions);
  record.smsSid = message.sid;
  record.smsStatus = message.status || "queued";
  record.mode = "live";
  record.outcome = "SMS sent";
  return record;
}

async function processMissedCall(payload, options = {}) {
  const phone = normalisePhone(payload.phone || payload.from || payload.From);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("A valid caller phone number is required.");

  const existing = options.force ? null : findRecentByPhone(phone);
  if (existing) return { record: existing, duplicate: true };

  const id = safeText(payload.id || payload.callId || payload.CallSid, 100) || `MC-${crypto.randomUUID()}`;
  const record = {
    id,
    callerName: safeText(payload.callerName || payload.name || "Unknown caller", 100),
    phone,
    reason: safeText(payload.reason || "Missed incoming call", 160),
    callAt: payload.callAt || payload.timestamp || new Date().toISOString(),
    callStatus: safeText(payload.callStatus || payload.status || payload.DialCallStatus || "no-answer", 40),
    provider: safeText(payload.provider || "Phone system", 80),
    providerCallId: safeText(payload.callId || payload.CallSid || "", 100),
    bookingUrl: bookingUrl(id),
    smsStatus: "queued",
    smsSentAt: null,
    openedAt: null,
    bookedAt: null,
    outcome: "SMS queued",
    mode: options.real ? "live" : "simulated",
  };

  upsertMissedCall(record);
  try {
    await sendRecoverySms(record, { real: options.real });
  } catch (error) {
    console.error("Missed-call SMS error:", error);
    record.smsStatus = "failed";
    record.outcome = "Needs review";
    record.error = "SMS send failed";
  }
  upsertMissedCall(record);
  return { record, duplicate: false };
}

function validateTwilioRequest(request, response, next) {
  if (!validateTwilioWebhooks) return next();
  if (!twilioAuthToken) return response.status(503).send("Twilio webhook validation is enabled without an auth token.");
  const signature = request.get("x-twilio-signature") || "";
  const url = `${PUBLIC_BASE_URL}${request.originalUrl}`;
  if (!twilio.validateRequest(twilioAuthToken, signature, url, request.body)) return response.status(403).send("Invalid Twilio signature.");
  return next();
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    aiConfigured: Boolean(openai),
    model: MODEL,
    smsConfigured,
    smsProvider: "Twilio",
    publicBaseUrl: PUBLIC_BASE_URL,
    missedCallWebhookConfigured: Boolean(twilioClient || MISSED_CALL_WEBHOOK_SECRET),
    twilioCallMode: TWILIO_CALL_MODE,
  });
});

app.get("/api/missed-calls", (_request, response) => {
  response.json({ records: missedCalls.slice(0, 200) });
});

app.post("/api/missed-calls/simulate", async (request, response) => {
  try {
    const sendReal = Boolean(request.body?.sendReal);
    if (sendReal && !smsConfigured) return response.status(400).json({ error: "Twilio SMS is not configured in .env." });
    const result = await processMissedCall({
      callerName: request.body?.callerName,
      phone: request.body?.phone,
      reason: request.body?.reason || "Demo missed call",
      provider: "Pingstar simulator",
      callStatus: "no-answer",
    }, { force: true, real: sendReal });
    return response.status(201).json(result);
  } catch (error) {
    return response.status(400).json({ error: error.message || "Could not simulate the missed call." });
  }
});

app.post("/api/missed-calls/:id/engagement", (request, response) => {
  const record = findMissedCall(request.params.id);
  if (!record) return response.status(404).json({ error: "Missed call not found." });
  const stage = safeText(request.body?.stage, 20).toLowerCase();
  const timestamp = new Date().toISOString();
  if (stage === "opened") {
    record.openedAt ||= timestamp;
    record.outcome = record.bookedAt ? "Booked" : "Opened";
  } else if (stage === "booked") {
    record.openedAt ||= timestamp;
    record.bookedAt ||= timestamp;
    record.outcome = "Booked";
    if (request.body?.booking && typeof request.body.booking === "object") {
      record.booking = {
        reference: safeText(request.body.booking.reference, 80),
        appointmentType: safeText(request.body.booking.appointmentType, 100),
        type: safeText(request.body.booking.type, 40),
        date: safeText(request.body.booking.date, 20),
        time: safeText(request.body.booking.time, 10),
        practitioner: safeText(request.body.booking.practitioner, 100),
        duration: Math.max(10, Math.min(180, Number(request.body.booking.duration || 30))),
        name: safeText(request.body.booking.name, 120),
        email: safeText(request.body.booking.email, 160),
        phone: normalisePhone(request.body.booking.phone || record.phone),
      };
    }
  } else {
    return response.status(400).json({ error: "Stage must be opened or booked." });
  }
  return response.json({ record });
});

app.post("/api/missed-calls/:id/resend", async (request, response) => {
  const record = findMissedCall(request.params.id);
  if (!record) return response.status(404).json({ error: "Missed call not found." });
  try {
    await sendRecoverySms(record, { real: smsConfigured });
    return response.json({ record });
  } catch (error) {
    record.smsStatus = "failed";
    record.outcome = "Needs review";
    return response.status(502).json({ error: "The SMS could not be resent.", record });
  }
});

// Generic adapter for a PBX, SIP platform or contact-centre product.
// Send JSON containing at least: { "from": "+447...", "status": "no-answer", "callId": "..." }
app.post("/api/webhooks/missed-call", async (request, response) => {
  if (MISSED_CALL_WEBHOOK_SECRET && request.get("x-pingstar-webhook-secret") !== MISSED_CALL_WEBHOOK_SECRET) {
    return response.status(401).json({ error: "Invalid webhook secret." });
  }
  const status = safeText(request.body?.status || request.body?.callStatus, 40).toLowerCase();
  if (!['no-answer', 'busy', 'failed', 'canceled', 'cancelled', 'missed'].includes(status)) {
    return response.status(202).json({ accepted: true, ignored: true, reason: "Call was not marked as missed." });
  }
  try {
    const result = await processMissedCall({ ...request.body, provider: request.body?.provider || "External phone system" }, { real: true });
    return response.status(202).json({ accepted: true, ...result });
  } catch (error) {
    return response.status(400).json({ error: error.message || "Invalid missed-call webhook." });
  }
});

// Twilio number Voice webhook. It forwards the call to the practice and receives the Dial result below.
app.post("/api/webhooks/twilio/incoming-call", validateTwilioRequest, async (request, response) => {
  response.type("text/xml");
  const caller = normalisePhone(request.body?.From);
  const callSid = safeText(request.body?.CallSid, 100);
  if (TWILIO_CALL_MODE === "recovery-only" || !PRACTICE_FORWARD_NUMBER) {
    await processMissedCall({ phone: caller, callId: callSid, provider: "Twilio Voice", status: "no-answer" }, { real: true }).catch(error => console.error(error));
    return response.send(`<Response><Say voice="alice">Sorry we missed your call. We have sent you a text message with a link to book an appointment or chat with our optical assistant.</Say></Response>`);
  }
  const action = `/api/webhooks/twilio/dial-complete?caller=${encodeURIComponent(caller)}&callId=${encodeURIComponent(callSid)}`;
  return response.send(`<Response><Dial timeout="20" answerOnBridge="true" action="${xml(action)}" method="POST">${xml(PRACTICE_FORWARD_NUMBER)}</Dial></Response>`);
});

app.post("/api/webhooks/twilio/dial-complete", validateTwilioRequest, async (request, response) => {
  response.type("text/xml");
  const status = safeText(request.body?.DialCallStatus, 40).toLowerCase();
  const caller = normalisePhone(request.query?.caller || request.body?.From);
  const callId = safeText(request.query?.callId || request.body?.CallSid, 100);
  if (['no-answer', 'busy', 'failed', 'canceled'].includes(status)) {
    await processMissedCall({ phone: caller, callId, provider: "Twilio Voice", status }, { real: true }).catch(error => console.error(error));
    return response.send(`<Response><Say voice="alice">Sorry we missed your call. We have sent you a text message with a link to book an appointment or chat with our optical assistant.</Say></Response>`);
  }
  return response.send("<Response></Response>");
});

app.post("/api/webhooks/twilio/sms-status", validateTwilioRequest, (request, response) => {
  const sid = safeText(request.body?.MessageSid, 100);
  const record = missedCalls.find(item => item.smsSid === sid);
  if (record) {
    record.smsStatus = safeText(request.body?.MessageStatus, 40) || record.smsStatus;
    if (/delivered/i.test(record.smsStatus)) record.outcome = record.bookedAt ? "Booked" : record.openedAt ? "Opened" : "Delivered";
    if (/failed|undelivered/i.test(record.smsStatus)) record.outcome = "Needs review";
  }
  response.sendStatus(204);
});

app.post("/api/public-chat", async (request, response) => {
  if (!openai) return response.status(503).json({ error: "OPENAI_API_KEY is not configured on the server." });
  const message = String(request.body?.message || "").trim().slice(0, 1000);
  const publicContext = request.body?.context || {};
  const history = Array.isArray(request.body?.history) ? request.body.history.slice(-8) : [];
  if (!message) return response.status(400).json({ error: "A message is required." });
  const safeHistory = history.filter(item => item && ["user", "assistant"].includes(item.role)).map(item => ({ role: item.role, content: String(item.content || "").slice(0, 1200) }));
  const instructions = `
You are the customer-facing Optical Assistant for the fictional ClearView Opticians demonstration website.
Use only the public practice facts and appointment types supplied in PUBLIC WEBSITE CONTEXT.
Help visitors understand appointment types, opening hours, location, preparation, illustrative prices and how the booking demo works.
Do not access, request or reveal customer records, clinical notes, prescriptions, staff-only data or private practice information.
Do not diagnose, interpret symptoms, prescribe, recommend treatment or present yourself as a qualified optometrist.
For health or symptom questions, say that you cannot assess symptoms online, offer an urgent appointment or qualified-person handoff, and advise urgent medical care for sudden or severe symptoms.
Do not claim an appointment has been booked, changed, cancelled, emailed or messaged. The website's guided booking controls perform those demo actions.
Use British English. Keep replies concise, friendly and suitable for a public website.`.trim();
  try {
    const apiResponse = await openai.responses.create({
      model: MODEL, store: false, reasoning: { effort: "low" }, instructions,
      input: [{ role: "developer", content: `PUBLIC WEBSITE CONTEXT\n${JSON.stringify(publicContext)}` }, ...safeHistory, { role: "user", content: message }],
    });
    return response.json({ reply: apiResponse.output_text || "I could not produce an answer. Please use the booking options or request an optician handoff.", model: MODEL });
  } catch (error) {
    console.error("Public OpenAI chat error:", error);
    const status = Number(error?.status) || 500;
    return response.status(status >= 400 && status < 600 ? status : 500).json({ error: "The live website assistant is temporarily unavailable." });
  }
});

app.post("/api/chat", async (request, response) => {
  if (!openai) return response.status(503).json({ error: "OPENAI_API_KEY is not configured on the server." });
  const message = String(request.body?.message || "").trim();
  const context = request.body?.context || {};
  const history = Array.isArray(request.body?.history) ? request.body.history.slice(-10) : [];
  if (!message) return response.status(400).json({ error: "A message is required." });
  const safeHistory = history.filter(item => item && ["user", "assistant"].includes(item.role)).map(item => ({ role: item.role, content: String(item.content || "").slice(0, 2500) }));
  const instructions = `
You are Pingstar AI, a practice-management copilot for an optician.
Answer questions using only the practice data snapshot supplied by the application.
If the data does not contain the answer, say that clearly and do not invent a customer, appointment, sale, message, condition, result, or workflow.
Treat all records as confidential. Do not repeat unnecessary personal details.
You may summarise clinical notes and flags, but you must not diagnose, prescribe, recommend treatment, or replace an optometrist. For clinical interpretation or urgent symptoms, advise staff to obtain review from a qualified clinician.
Do not claim that you have sent a message, booked an appointment, changed a record, or completed an automation. Explain the proposed action and ask the user to use the relevant app control.
Use British English, GBP, and UK-style dates. Keep answers clear and practical.`.trim();
  try {
    const apiResponse = await openai.responses.create({
      model: MODEL, store: false, reasoning: { effort: "low" }, instructions,
      input: [{ role: "developer", content: `CURRENT PRACTICE DATA SNAPSHOT\n${JSON.stringify(context)}` }, ...safeHistory, { role: "user", content: message }],
    });
    return response.json({ reply: apiResponse.output_text || "No text response was returned.", responseId: apiResponse.id, model: MODEL });
  } catch (error) {
    console.error("OpenAI API error:", error);
    const status = Number(error?.status) || 500;
    const publicMessage = status === 401 ? "The OpenAI API key was rejected. Check the key in .env and restart the server." : status === 429 ? "The OpenAI API rate or spending limit was reached. Check the API project limits and billing." : "The live AI request failed. Check the server terminal for details.";
    return response.status(status >= 400 && status < 600 ? status : 500).json({ error: publicMessage });
  }
});


// -----------------------------------------------------------------------------
// Optional live mailbox connection (Google Workspace Gmail or Microsoft 365).
// Development/demo token persistence uses a local file. In production, store
// encrypted tokens per tenant in a database or secrets service.
// -----------------------------------------------------------------------------
const MAIL_TOKEN_FILE = path.join(__dirname, ".mail-connection.json");
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
const GOOGLE_REDIRECT_URI = String(process.env.GOOGLE_REDIRECT_URI || `${PUBLIC_BASE_URL}/api/mail/google/callback`).trim();
const MICROSOFT_CLIENT_ID = String(process.env.MICROSOFT_CLIENT_ID || "").trim();
const MICROSOFT_CLIENT_SECRET = String(process.env.MICROSOFT_CLIENT_SECRET || "").trim();
const MICROSOFT_TENANT_ID = String(process.env.MICROSOFT_TENANT_ID || "common").trim();
const MICROSOFT_REDIRECT_URI = String(process.env.MICROSOFT_REDIRECT_URI || `${PUBLIC_BASE_URL}/api/mail/microsoft/callback`).trim();
const oauthStates = new Map();

function readMailConnection() {
  try { return JSON.parse(fs.readFileSync(MAIL_TOKEN_FILE, "utf8")); } catch { return null; }
}
function writeMailConnection(connection) {
  fs.writeFileSync(MAIL_TOKEN_FILE, JSON.stringify(connection, null, 2), { mode: 0o600 });
}
function deleteMailConnection() {
  try { fs.unlinkSync(MAIL_TOKEN_FILE); } catch {}
}
function providerLabel(provider) { return provider === "google" ? "Google Workspace / Gmail" : provider === "microsoft" ? "Microsoft 365 / Outlook" : "Mailbox"; }
function newOAuthState(provider) {
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, { provider, expires: Date.now() + 10 * 60_000 });
  return state;
}
function consumeOAuthState(state, provider) {
  const value = oauthStates.get(state); oauthStates.delete(state);
  return Boolean(value && value.provider === provider && value.expires > Date.now());
}
async function jsonFetch(url, options = {}) {
  const result = await fetch(url, options);
  const text = await result.text();
  let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!result.ok) throw new Error(data.error_description || data.error?.message || data.error || `Provider request failed (${result.status}).`);
  return data;
}
async function formPost(url, values) {
  return jsonFetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values) });
}
async function googleAccessToken(connection) {
  if (connection.accessToken && Number(connection.expiresAt || 0) > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken) throw new Error("Google refresh token is missing. Reconnect the mailbox.");
  const token = await formPost("https://oauth2.googleapis.com/token", { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: connection.refreshToken, grant_type: "refresh_token" });
  connection.accessToken = token.access_token; connection.expiresAt = Date.now() + Number(token.expires_in || 3600) * 1000; writeMailConnection(connection); return connection.accessToken;
}
async function microsoftAccessToken(connection) {
  if (connection.accessToken && Number(connection.expiresAt || 0) > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken) throw new Error("Microsoft refresh token is missing. Reconnect the mailbox.");
  const token = await formPost(`https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`, { client_id: MICROSOFT_CLIENT_ID, client_secret: MICROSOFT_CLIENT_SECRET, refresh_token: connection.refreshToken, grant_type: "refresh_token", redirect_uri: MICROSOFT_REDIRECT_URI, scope: "offline_access openid profile email User.Read Mail.ReadWrite Mail.Send" });
  connection.accessToken = token.access_token; connection.refreshToken = token.refresh_token || connection.refreshToken; connection.expiresAt = Date.now() + Number(token.expires_in || 3600) * 1000; writeMailConnection(connection); return connection.accessToken;
}
async function currentMailAccess(connection) {
  if (!connection) throw new Error("No mailbox is connected.");
  if (connection.provider === "google") return googleAccessToken(connection);
  if (connection.provider === "microsoft") return microsoftAccessToken(connection);
  throw new Error("Unsupported mailbox provider.");
}
function b64urlDecode(value = "") {
  try { return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch { return ""; }
}
function gmailHeader(headers = [], name) { return headers.find(item => String(item.name).toLowerCase() === name.toLowerCase())?.value || ""; }
function gmailPlainText(payload) {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) return b64urlDecode(payload.body.data);
  for (const part of payload.parts || []) { const found = gmailPlainText(part); if (found) return found; }
  if (payload.body?.data) return b64urlDecode(payload.body.data);
  return "";
}
async function gmailListFolder(accessToken, labelId, folder, limit = 15) {
  const list = await jsonFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&labelIds=${encodeURIComponent(labelId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const items = await Promise.all((list.messages || []).map(async item => {
    const message = await jsonFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=full`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const labels = message.labelIds || []; const headers = message.payload?.headers || [];
    return { id: `gmail:${message.id}`, folder, from: gmailHeader(headers, "From"), to: gmailHeader(headers, "To"), subject: gmailHeader(headers, "Subject") || "(No subject)", datetime: new Date(Number(message.internalDate || Date.now())).toISOString(), body: (gmailPlainText(message.payload) || message.snippet || "").slice(0, 12000), unread: labels.includes("UNREAD"), starred: labels.includes("STARRED") };
  }));
  return items;
}
async function gmailMessages(connection) {
  const accessToken = await googleAccessToken(connection);
  const [inbox, sent] = await Promise.all([gmailListFolder(accessToken, "INBOX", "inbox"), gmailListFolder(accessToken, "SENT", "sent", 10)]);
  return [...inbox, ...sent];
}
async function microsoftFolder(accessToken, folderName, folder) {
  const select = encodeURIComponent("id,subject,from,toRecipients,receivedDateTime,sentDateTime,isRead,bodyPreview,flag");
  const data = await jsonFetch(`https://graph.microsoft.com/v1.0/me/mailFolders/${folderName}/messages?$top=20&$orderby=receivedDateTime%20desc&$select=${select}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  return (data.value || []).map(message => ({ id: `m365:${message.id}`, folder, from: message.from?.emailAddress?.address || "", to: (message.toRecipients || []).map(x => x.emailAddress?.address).filter(Boolean).join(", "), subject: message.subject || "(No subject)", datetime: message.receivedDateTime || message.sentDateTime || new Date().toISOString(), body: message.bodyPreview || "", unread: folder === "inbox" ? !message.isRead : false, starred: String(message.flag?.flagStatus || "").toLowerCase() === "flagged" }));
}
async function microsoftMessages(connection) {
  const accessToken = await microsoftAccessToken(connection);
  const [inbox, sent] = await Promise.all([microsoftFolder(accessToken, "inbox", "inbox"), microsoftFolder(accessToken, "sentitems", "sent")]);
  return [...inbox, ...sent];
}

app.get("/api/mail/status", (_request, response) => {
  const connection = readMailConnection();
  response.json({ connected: Boolean(connection?.provider), provider: connection?.provider || null, providerLabel: providerLabel(connection?.provider), email: connection?.email || "", configuredProviders: { google: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET), microsoft: Boolean(MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET) } });
});

app.get("/api/mail/google/connect", (_request, response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return response.status(503).send("Google OAuth is not configured in .env.");
  const state = newOAuthState("google");
  const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: GOOGLE_REDIRECT_URI, response_type: "code", access_type: "offline", prompt: "consent", state, scope: "openid email https://www.googleapis.com/auth/gmail.modify" });
  response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});
app.get("/api/mail/google/callback", async (request, response) => {
  try {
    if (!consumeOAuthState(String(request.query.state || ""), "google")) return response.status(400).send("Invalid or expired OAuth state.");
    const token = await formPost("https://oauth2.googleapis.com/token", { code: String(request.query.code || ""), client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: "authorization_code" });
    const profile = await jsonFetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${token.access_token}` } });
    writeMailConnection({ provider: "google", email: profile.emailAddress || "", accessToken: token.access_token, refreshToken: token.refresh_token || "", expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000, connectedAt: new Date().toISOString() });
    response.redirect("/index.html?mail=connected&provider=google");
  } catch (error) { response.status(500).send(`Google mailbox connection failed: ${safeText(error.message, 300)}`); }
});

app.get("/api/mail/microsoft/connect", (_request, response) => {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) return response.status(503).send("Microsoft OAuth is not configured in .env.");
  const state = newOAuthState("microsoft");
  const params = new URLSearchParams({ client_id: MICROSOFT_CLIENT_ID, response_type: "code", redirect_uri: MICROSOFT_REDIRECT_URI, response_mode: "query", state, scope: "offline_access openid profile email User.Read Mail.ReadWrite Mail.Send" });
  response.redirect(`https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/authorize?${params}`);
});
app.get("/api/mail/microsoft/callback", async (request, response) => {
  try {
    if (!consumeOAuthState(String(request.query.state || ""), "microsoft")) return response.status(400).send("Invalid or expired OAuth state.");
    const token = await formPost(`https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`, { client_id: MICROSOFT_CLIENT_ID, client_secret: MICROSOFT_CLIENT_SECRET, code: String(request.query.code || ""), redirect_uri: MICROSOFT_REDIRECT_URI, grant_type: "authorization_code", scope: "offline_access openid profile email User.Read Mail.ReadWrite Mail.Send" });
    const me = await jsonFetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName", { headers: { Authorization: `Bearer ${token.access_token}` } });
    writeMailConnection({ provider: "microsoft", email: me.mail || me.userPrincipalName || "", accessToken: token.access_token, refreshToken: token.refresh_token || "", expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000, connectedAt: new Date().toISOString() });
    response.redirect("/index.html?mail=connected&provider=microsoft");
  } catch (error) { response.status(500).send(`Microsoft mailbox connection failed: ${safeText(error.message, 300)}`); }
});

app.get("/api/mail/messages", async (_request, response) => {
  try {
    const connection = readMailConnection(); if (!connection) return response.status(400).json({ error: "No live mailbox is connected." });
    const messages = connection.provider === "google" ? await gmailMessages(connection) : await microsoftMessages(connection);
    response.json({ provider: connection.provider, providerLabel: providerLabel(connection.provider), email: connection.email, messages });
  } catch (error) { console.error("Mailbox sync error:", error); response.status(502).json({ error: safeText(error.message, 300) || "Mailbox sync failed." }); }
});

app.post("/api/mail/send", async (request, response) => {
  try {
    const connection = readMailConnection(); if (!connection) return response.status(400).json({ error: "No live mailbox is connected." });
    const to = safeText(request.body?.to, 300), subject = safeText(request.body?.subject, 300), body = String(request.body?.body || "").slice(0, 20000);
    if (!to || !subject || !body) return response.status(400).json({ error: "Recipient, subject and body are required." });
    const accessToken = await currentMailAccess(connection);
    let id = `LIVE-${Date.now()}`;
    if (connection.provider === "google") {
      const mime = `To: ${to}\r\nSubject: ${subject.replace(/[\r\n]/g, " ")}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
      const sent = await jsonFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }) });
      id = `gmail:${sent.id}`;
    } else {
      await jsonFetch("https://graph.microsoft.com/v1.0/me/sendMail", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: { subject, body: { contentType: "Text", content: body }, toRecipients: to.split(/[,;]/).map(address => ({ emailAddress: { address: address.trim() } })).filter(x => x.emailAddress.address) }, saveToSentItems: true }) });
      id = `m365:${Date.now()}`;
    }
    response.json({ ok: true, id, from: connection.email, datetime: new Date().toISOString(), provider: connection.provider });
  } catch (error) { console.error("Mailbox send error:", error); response.status(502).json({ error: safeText(error.message, 300) || "Email send failed." }); }
});

app.post("/api/mail/disconnect", (_request, response) => { deleteMailConnection(); response.json({ ok: true }); });

app.use((request, response) => {
  if (request.path.startsWith("/api/")) return response.status(404).json({ error: "API route not found." });
  return response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Pingstar AI is running at http://localhost:${PORT}`);
  console.log(openai ? `Live AI enabled with model: ${MODEL}` : "No OpenAI key found: local AI fallback only.");
  console.log(smsConfigured ? "Twilio SMS is configured." : "Twilio SMS is not configured: missed-call simulator remains available.");
  console.log(`Public booking base URL: ${PUBLIC_BASE_URL}`);
});
