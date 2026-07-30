// A stand-in for real inbox data.
//
// Real Gmail/Outlook scanning needs OAuth (a Google Cloud project + consent
// screen, or an Azure app registration) which only you can set up under your
// own account — Claude can't provision that for you. Once you have it, swap
// this file for a call to the Gmail/Outlook API that fetches recent messages
// in this same { subject, from, date, body } shape, and everything downstream
// (the AI extraction in routes/scan.js) keeps working unchanged.
//
// This mock inbox intentionally mixes real subscription receipts with
// unrelated emails, so the AI actually has to discriminate — not just
// echo back a hardcoded list.

module.exports = [
  {
    subject: 'Your Netflix payment receipt',
    from: 'info@netflix.com',
    date: '2026-07-21',
    body: 'Hi, thanks for being a Netflix member. We charged ₹649.00 to your card ending in 4021 for your Premium plan. Your next billing date is Aug 21, 2026.',
  },
  {
    subject: 'Your Spotify Premium receipt',
    from: 'no-reply@spotify.com',
    date: '2026-07-18',
    body: 'Your Spotify Family plan renewed. Amount charged: ₹179.00. Next renewal: 2026-08-18. Manage your plan anytime in your account settings.',
  },
  {
    subject: "Let's catch up this weekend?",
    from: 'rohan.mehta@gmail.com',
    date: '2026-07-17',
    body: "Hey! It's been a while. Are you free Saturday for coffee? Let me know what works.",
  },
  {
    subject: 'Your Amazon Prime membership has renewed',
    from: 'auto-confirm@amazon.in',
    date: '2026-07-15',
    body: 'Your Amazon Prime annual membership was renewed for ₹1,499.00. This covers you until July 2027. Thanks for being a Prime member.',
  },
  {
    subject: 'Weekly newsletter: 5 design trends for 2026',
    from: 'newsletter@designweekly.com',
    date: '2026-07-14',
    body: 'This week we cover glassmorphism revivals, kinetic typography, and more. Read the full issue on our site.',
  },
  {
    subject: 'Your Notion invoice is ready',
    from: 'billing@makenotion.com',
    date: '2026-07-10',
    body: 'Your Notion Plus subscription was billed ₹830.00 for the monthly plan. Your next invoice will be generated on 2026-08-10.',
  },
  {
    subject: 'Payment receipt from Adobe',
    from: 'message@adobe.com',
    date: '2026-07-08',
    body: 'Thank you for your Creative Cloud All Apps subscription payment of ₹1,675.00. Your plan renews monthly on the 8th.',
  },
  {
    subject: 'Your electricity bill is now available',
    from: 'billing@mseb.gov.in',
    date: '2026-07-05',
    body: 'Your electricity bill of ₹2,140 for June is now available. This is a utility bill, not a subscription service.',
  },
  {
    subject: 'iCloud+ storage receipt',
    from: 'no_reply@email.apple.com',
    date: '2026-07-03',
    body: 'You were charged ₹219.00 for iCloud+ 200GB storage. Your subscription renews monthly.',
  },
];
