require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const scanRoutes = require('./routes/scan');
const subscriptionsRoutes = require('./routes/subscriptions');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env — copy .env.example to .env and set one.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || `http://localhost:${PORT}`,
    credentials: true,
  })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// Serve the frontend (index.html, login.html, signup.html, dashboard.html, styles.css)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Bleed backend running at http://localhost:${PORT}`);
});
