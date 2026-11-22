/**
 * BACKEND ENTRY POINT  (Node.js + Express)
 * ------------------------------------------------------------
 *   Browser  --HTTP-->  Express  --SQL-->  SQLite (server/data/finora.db)
 *
 * Ek hi server do kaam karta hai:
 *   1. /public folder ki HTML/CSS/JS files (FRONTEND) serve karta hai
 *   2. /api/* par JSON endpoints (BACKEND) deta hai
 */
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db');
const { userFromRequest } = require('./auth');
const { ensureDemo } = require('./seed');

const app = express();
const PUBLIC = path.join(__dirname, '..', 'public');
app.set('trust proxy', 1); // Render/Codespaces jaise hosts proxy ke peeche chalte hain

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], frameAncestors: ["'none'"],
      objectSrc: ["'none'"], upgradeInsecureRequests: null,
    },
  },
}));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// ---------- API ----------
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT) || 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Bohat zyada koshishein. Thori der baad dobara try karein.' } });

app.get('/api/health', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  res.json({ status: 'ok', database: 'sqlite', users, time: new Date().toISOString() });
});
app.use('/api/auth/login', limiter);
app.use('/api/auth/signup', limiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api', require('./routes/transactions'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Yeh API endpoint maujood nahi.' }));

// ---------- PAGE GUARD (server-side) ----------
// Private pages login ke baghair khulti hi nahi; login/signup logged-in user ko dashboard par bhej dete hain.
const PRIVATE = ['/dashboard.html', '/expense.html', '/report.html', '/profile.html'];
const GUEST_ONLY = ['/login.html', '/signup.html'];
app.use((req, res, next) => {
  if (PRIVATE.includes(req.path) && !userFromRequest(req)) return res.redirect('/login.html?next=' + encodeURIComponent(req.path));
  if (GUEST_ONLY.includes(req.path) && userFromRequest(req)) return res.redirect('/dashboard.html');
  next();
});

app.get('/', (req, res) => res.redirect('/home.html'));
app.use(express.static(PUBLIC, { extensions: ['html'] }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));
app.use((err, req, res, next) => { // JSON parse error waghera
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request ka format ghalat hai.' });
  console.error(err);
  res.status(500).json({ error: 'Server mein masla aa gaya.' });
});

if (process.env.SEED_DEMO !== 'false') ensureDemo();

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Finora chal raha hai -> http://localhost:${PORT}`));
}
module.exports = app;
