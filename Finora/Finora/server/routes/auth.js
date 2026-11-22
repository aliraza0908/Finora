const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { issueCookie, clearCookie, requireAuth } = require('../auth');
const { validName, validEmail, validPassword, PASSWORD_RULE } = require('../validate');

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at });

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  const fields = {};
  if (!validName(name)) fields.name = 'Naam 2 se 60 characters ka hona chahiye.';
  if (!validEmail(email)) fields.email = 'Sahi email likhein.';
  if (!validPassword(password)) fields.password = PASSWORD_RULE;
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Form mein ghalti hai.', fields });

  if (findByEmail.get(email.trim())) {
    return res.status(409).json({ error: 'Is email se account pehle se maujood hai.', fields: { email: 'Yeh email pehle se registered hai.' } });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = insertUser.run(name.trim(), email.trim().toLowerCase(), hash);
  issueCookie(res, info.lastInsertRowid);
  res.status(201).json({ user: { id: info.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email aur password dono likhein.' });
  }
  const user = findByEmail.get(email.trim());
  // Same message dono cases mein, taa-ke attacker ko pata na chale email maujood hai ya nahi
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ya password ghalat hai.' });
  }
  issueCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => { clearCookie(res); res.json({ ok: true }); });

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
