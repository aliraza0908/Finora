const router = require('express').Router();
const db = require('../db');
const { validName, validEmail } = require('../validate');

// POST /api/contact  (public)
router.post('/', (req, res) => {
  const { name, email, message } = req.body || {};
  const fields = {};
  if (!validName(name)) fields.name = 'Apna naam likhein.';
  if (!validEmail(email)) fields.email = 'Sahi email likhein.';
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 1000) fields.message = 'Message 10 se 1000 characters ka ho.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Form mein ghalti hai.', fields });
  db.prepare('INSERT INTO contacts (name, email, message) VALUES (?,?,?)').run(name.trim(), email.trim(), message.trim());
  res.status(201).json({ ok: true });
});

module.exports = router;
