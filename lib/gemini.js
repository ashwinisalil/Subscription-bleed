// Thin wrapper around the Gemini API (free tier).
// Requires GEMINI_API_KEY in .env (get one free, no credit card, at
// https://aistudio.google.com/apikey).
//
// Google changes which models are on the free tier fairly often — if you
// get a 429 or a "model not found" error, check the current free-tier
// model list in Google AI Studio and update GEMINI_MODEL in .env.

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const EXTRACTION_SYSTEM_PROMPT = `You are a subscription-detection engine for a personal finance app.
You will be given a batch of raw emails (subject, sender, date, body).
Identify ONLY emails that are receipts, invoices, or renewal notices for a recurring subscription or membership.
Ignore personal emails, newsletters, one-time purchases, and non-subscription bills (like utility bills).

Respond with ONLY a JSON array (no prose, no markdown fences). Each item:
{
  "vendor": string,            // e.g. "Netflix"
  "amount": number|null,       // numeric amount charged, no currency symbol
  "currency": string,          // e.g. "INR", "USD" — infer from symbol/context, default "INR" if ambiguous
  "billingCycle": "monthly"|"yearly"|"unknown",
  "nextRenewal": string|null,  // YYYY-MM-DD if stated or inferable, else null
  "confidence": "high"|"medium"|"low",
  "sourceSubject": string      // the email subject this was detected from
}

If no subscriptions are found, respond with an empty array: []`;

async function extractSubscriptions(emails) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error(
      'GEMINI_API_KEY is not set. Add it to your .env file — get a free key at https://aistudio.google.com/apikey'
    );
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  const emailsBlock = emails
    .map(
      (e, i) =>
        `--- Email ${i + 1} ---\nSubject: ${e.subject}\nFrom: ${e.from}\nDate: ${e.date}\nBody: ${e.body}`
    )
    .join('\n\n');

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: emailsBlock }] }],
        systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (networkErr) {
    const err = new Error('Could not reach the Gemini API — check your internet connection.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (response.status === 429) {
    const err = new Error('Gemini free-tier rate limit hit. Wait a minute and try again.');
    err.code = 'RATE_LIMIT';
    throw err;
  }

  if (response.status === 404) {
    const err = new Error(
      `Model "${MODEL}" wasn't found — Google likely renamed or retired it. Check the current model list at https://ai.google.dev/gemini-api/docs/models and update GEMINI_MODEL in .env.`
    );
    err.code = 'MODEL_NOT_FOUND';
    throw err;
  }

  if (!response.ok) {
    const errBody = await response.text();
    const err = new Error(`Gemini API error (${response.status}): ${errBody}`);
    err.code = 'API_ERROR';
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];

  let parsed;
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error('Could not parse the AI response as JSON.');
    err.code = 'PARSE_ERROR';
    err.raw = text;
    throw err;
  }

  if (!Array.isArray(parsed)) return [];
  return parsed;
}

module.exports = { extractSubscriptions };
