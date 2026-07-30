const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { addManualSubscription } = require('../db');

const router = express.Router();

// ---------- POST /api/subscriptions ----------
// Manually add a subscription (the "+ Add subscription" button).
router.post('/', requireAuth, (req, res) => {
  const { vendor, amount, currency, billingCycle, nextRenewal } = req.body;

  if (!vendor || !vendor.trim()) {
    return res.status(400).json({ error: 'Subscription name is required.' });
  }
  if (amount !== null && amount !== undefined && amount !== '' && (isNaN(amount) || Number(amount) < 0)) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }
  const validCycles = ['monthly', 'yearly', 'unknown'];
  if (billingCycle && !validCycles.includes(billingCycle)) {
    return res.status(400).json({ error: 'Invalid billing cycle.' });
  }

  const record = addManualSubscription(req.userId, {
    vendor: vendor.trim(),
    amount: amount === '' || amount === undefined ? null : Number(amount),
    currency: currency || 'INR',
    billingCycle: billingCycle || 'unknown',
    nextRenewal: nextRenewal || null,
  });

  res.status(201).json({ subscription: record });
});

module.exports = router;
