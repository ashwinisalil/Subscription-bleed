// Simple JSON-file user store.
// Good enough for a portfolio project / early-stage app.
// Swap this for a real database (Postgres, MongoDB, etc.) later without
// touching routes/auth.js much — just keep the same function signatures.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'users.json');

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function findUserByEmail(email) {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

function createUser({ firstName, lastName, email, passwordHash }) {
  const db = readDb();
  const newUser = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    firstName,
    lastName,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

function updateUser(id, updates) {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeDb(db);
  return db.users[idx];
}

module.exports = { findUserByEmail, findUserById, createUser, updateUser };

// ---------- Detected subscriptions (per user) ----------
const SUBS_PATH = path.join(__dirname, 'data', 'subscriptions.json');

function ensureSubsFile() {
  if (!fs.existsSync(SUBS_PATH)) {
    fs.writeFileSync(SUBS_PATH, JSON.stringify({ subscriptions: [] }, null, 2));
  }
}

function readSubs() {
  ensureSubsFile();
  return JSON.parse(fs.readFileSync(SUBS_PATH, 'utf-8'));
}

function writeSubs(data) {
  fs.writeFileSync(SUBS_PATH, JSON.stringify(data, null, 2));
}

function getSubscriptionsForUser(userId) {
  const db = readSubs();
  return db.subscriptions.filter((s) => s.userId === userId);
}

// Adds newly-detected subscriptions, skipping ones that look like duplicates
// of what's already stored for this user (same vendor, case-insensitive).
function addDetectedSubscriptions(userId, detected) {
  const db = readSubs();
  const existingVendors = new Set(
    db.subscriptions
      .filter((s) => s.userId === userId)
      .map((s) => s.vendor.toLowerCase())
  );

  const added = [];
  for (const item of detected) {
    if (!item.vendor || existingVendors.has(item.vendor.toLowerCase())) continue;
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId,
      vendor: item.vendor,
      amount: typeof item.amount === 'number' ? item.amount : null,
      currency: item.currency || 'INR',
      billingCycle: item.billingCycle || 'unknown',
      nextRenewal: item.nextRenewal || null,
      confidence: item.confidence || 'medium',
      source: 'ai-scan',
      sourceSubject: item.sourceSubject || null,
      detectedAt: new Date().toISOString(),
    };
    db.subscriptions.push(record);
    existingVendors.add(item.vendor.toLowerCase());
    added.push(record);
  }
  writeSubs(db);
  return added;
}

// Adds a single subscription entered manually by the user (from the
// "Add subscription" form). No dedup check — the user explicitly asked
// to add this one, unlike AI detection which should skip repeats.
function addManualSubscription(userId, data) {
  const db = readSubs();
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    userId,
    vendor: data.vendor,
    amount: typeof data.amount === 'number' ? data.amount : null,
    currency: data.currency || 'INR',
    billingCycle: data.billingCycle || 'unknown',
    nextRenewal: data.nextRenewal || null,
    confidence: 'high',
    source: 'manual',
    sourceSubject: null,
    detectedAt: new Date().toISOString(),
  };
  db.subscriptions.push(record);
  writeSubs(db);
  return record;
}

module.exports.getSubscriptionsForUser = getSubscriptionsForUser;
module.exports.addDetectedSubscriptions = addDetectedSubscriptions;
module.exports.addManualSubscription = addManualSubscription;
