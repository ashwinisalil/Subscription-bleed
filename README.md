# Bleed — backend

A small Express backend that adds real authentication to the Bleed frontend
(`index.html`, `login.html`, `signup.html`, `dashboard.html`).

## What's inside

- **Express** serves both the API and the static frontend (from `/public`), so there's no CORS to fight with.
- **bcryptjs** hashes passwords — plaintext passwords are never stored.
- **JWT stored in an httpOnly cookie** handles sessions (can't be read by JS, so it's safe from XSS token theft).
- **Users are stored in `data/users.json`** — a plain JSON file. Easy to inspect while learning, and easy to swap out for a real database later without touching the routes much (see `db.js`).
- The **dashboard is protected**: it calls `/api/auth/me` on load and redirects to `login.html` if you're not signed in.

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to any long random string (this is what signs your login tokens — don't ship the example value).

### AI inbox scanning (free — Google Gemini)

The dashboard's "Scan your inbox with AI" button calls the Gemini API (free tier, no credit card) to detect subscriptions from email text. To enable it:

1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no card required
2. Set `GEMINI_API_KEY` in `.env`

Without a key, the app still works fully — the scan button will just show a friendly "AI scanning isn't configured yet" message instead of erroring out.

The free tier is rate-limited (roughly 10 requests/minute, a few hundred/day depending on the model — Google adjusts these numbers periodically, check current limits in [Google AI Studio](https://aistudio.google.com)). If you hit a 429, the app shows a "rate limit hit, try again in a minute" message rather than failing silently.

**Important — real Gmail/Outlook access is not wired up yet.** That requires *you* to register an OAuth app in Google Cloud Console (or Azure for Outlook), which only you can do under your own developer account — I can't provision that on your behalf. Until then, "Scan demo inbox" runs the AI against a bundled mock inbox (`data/mockInbox.js`) that mixes real subscription receipts with decoy emails, so you can see the AI actually discriminating rather than just returning a hardcoded list. There's also a "paste an email to test" option so you can try it with real email text of your own.

When you're ready to wire up real Gmail scanning: swap `data/mockInbox.js` for a call to the Gmail API that returns messages in the same `{ subject, from, date, body }` shape — `routes/scan.js` and the AI extraction logic in `lib/gemini.js` don't need to change.

## Run it

```bash
npm start
```

or, for auto-restart while you're editing:

```bash
npm run dev
```

Then open **http://localhost:3000** — that's `index.html`. The full flow:

`index.html` → **Get started free** → `signup.html` → create an account → you're auto-logged-in and dropped on `dashboard.html`. Log out from the dashboard footer, then log back in through `login.html` (with the lamp intro) to confirm it round-trips.

## API reference

| Method | Route | Body | What it does |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ firstName, lastName, email, password }` | Creates a user, hashes the password, logs you in (sets cookie) |
| POST | `/api/auth/login` | `{ email, password }` | Verifies credentials, sets the session cookie |
| POST | `/api/auth/logout` | — | Clears the session cookie |
| GET  | `/api/auth/me` | — | Returns the logged-in user, or 401 if not logged in |
| POST | `/api/scan/demo` | — | Runs AI detection against the bundled mock inbox, saves new finds |
| POST | `/api/scan/text` | `{ text }` | Runs AI detection against pasted email text |
| GET  | `/api/scan/subscriptions` | — | Returns everything AI has detected for the logged-in user so far |
| POST | `/api/subscriptions` | `{ vendor, amount, billingCycle, nextRenewal }` | Manually add a subscription (the dashboard's "+ Add subscription" button) |
| PATCH | `/api/auth/me` | `{ firstName, lastName }` | Updates display name |
| PATCH | `/api/auth/password` | `{ currentPassword, newPassword }` | Changes password (verifies current password first) |

## Where to go from here

- Swap `db.js` for a real database (SQLite via `better-sqlite3`, or Postgres) once you outgrow the JSON file — the function signatures (`findUserByEmail`, `createUser`, etc.) are the contract to keep.
- Add rate limiting on `/api/auth/login` to slow down brute-force guessing (e.g. `express-rate-limit`).
- Add email verification before letting an account fully log in.
- Wire the dashboard's subscription data to a real `subscriptions` table tied to `userId`, instead of the hardcoded demo list.
