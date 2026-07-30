const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { extractSubscriptions } = require('../lib/gemini');
const { addDetectedSubscriptions, getSubscriptionsForUser } = require('../db');
const mockInbox = require('../data/mockInbox');

const router = express.Router();

// ---------- GET /api/scan/subscriptions ----------
// Returns everything already detected for the logged-in user.
router.get('/subscriptions', requireAuth, (req, res) => {
  res.json({ subscriptions: getSubscriptionsForUser(req.userId) });
});

// ---------- POST /api/scan/demo ----------
// Runs the AI extractor against the bundled mock inbox, standing in for a
// real Gmail/Outlook scan until OAuth is wired up.
router.post('/demo', requireAuth, async (req, res) => {
  try {
    const detected = await extractSubscriptions(mockInbox);
    const added = addDetectedSubscriptions(req.userId, detected);
    res.json({
      scanned: mockInbox.length,
      found: detected.length,
      added: added.length,
      subscriptions: added,
    });
  } catch (err) {
    handleScanError(err, res);
  }
});

// ---------- POST /api/scan/text ----------
// Lets you paste in real email text to see the AI detect (or correctly
// ignore) a subscription in it — useful for testing before OAuth exists.
router.post('/text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Paste some email text first.' });
    }
    const pseudoEmail = [{ subject: '(pasted email)', from: '(unknown)', date: new Date().toISOString().slice(0, 10), body: text }];
    const detected = await extractSubscriptions(pseudoEmail);
    const added = addDetectedSubscriptions(req.userId, detected);
    res.json({ found: detected.length, added: added.length, subscriptions: added });
  } catch (err) {
    handleScanError(err, res);
  }
});

function handleScanError(err, res) {
  console.error('Scan error:', err.message);
  if (err.code === 'MISSING_API_KEY') {
    return res.status(503).json({ error: 'AI scanning isn\'t configured on the server yet — add GEMINI_API_KEY to .env.' });
  }
  if (err.code === 'RATE_LIMIT') {
    return res.status(429).json({ error: err.message });
  }
  if (err.code === 'MODEL_NOT_FOUND') {
    return res.status(502).json({ error: err.message });
  }
  if (err.code === 'NETWORK_ERROR') {
    return res.status(503).json({ error: err.message });
  }
  if (err.code === 'API_ERROR') {
    return res.status(502).json({ error: 'The AI service failed to respond. Check your GEMINI_API_KEY and try again.' });
  }
  return res.status(500).json({ error: 'Something went wrong while scanning.' });
}

module.exports = router;
