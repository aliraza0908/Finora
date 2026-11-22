const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, clearCookie } = require('../auth');
const { validName, validEmail, validPassword, PASSWORD_RULE } = require('../validate');

router.use(requireAuth);

// GET /api/profile
router.get('/', (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) AS transactions FROM transactions WHERE user_id = ?').get(req.user.id);
  res.json({ user: req.user, stats });
});

// PUT /api/profile  (name, email)
router.put('/', (req, res) => {
  const { name, email } = req.body || {};
  const fields = {};
  if (!validName(name)) fields.name = 'Naam 2 se 60 characters ka hona chahiye.';
  if (!validEmail(email)) fields.email = 'Sahi email likhein.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Form mein ghalti hai.', fields });
  const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim(), req.user.id);
  if (clash) return res.status(409).json({ error: 'Yeh email kisi aur account ke pas hai.', fields: { email: 'Yeh email pehle se use mein hai.' } });
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), email.trim().toLowerCase(), req.user.id);
  res.json({ user: { ...req.user, name: name.trim(), email: email.trim().toLowerCase() } });
});

// PUT /api/profile/password
router.put('/password', (req, res) => {
  const { current, next } = req.body || {};
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (typeof current !== 'string' || !bcrypt.compareSync(current, row.password_hash)) {
    return res.status(400).json({ error: 'Maujooda password ghalat hai.', fields: { current: 'Maujooda password ghalat hai.' } });
  }
  if (!validPassword(next)) return res.status(400).json({ error: PASSWORD_RULE, fields: { next: PASSWORD_RULE } });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), req.user.id);
  res.json({ ok: true });
});

// DELETE /api/profile  (account aur uska saara data hamesha ke liye khatam)
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id); // transactions ON DELETE CASCADE se khud delete
  clearCookie(res);
  res.json({ ok: true });
});

module.exports = router;
