const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');
const { cleanTransaction, CATEGORIES } = require('../validate');

router.use(['/transactions', '/summary', '/categories', '/reports'], requireAuth); // sirf apne routes par guard

const r2 = (n) => Math.round((n || 0) * 100) / 100;

// GET /api/transactions?limit=&type=&month=YYYY-MM
router.get('/transactions', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
  const where = ['user_id = ?']; const args = [req.user.id];
  if (['income', 'expense'].includes(req.query.type)) { where.push('type = ?'); args.push(req.query.type); }
  if (/^\d{4}-\d{2}$/.test(req.query.month || '')) { where.push("substr(date,1,7) = ?"); args.push(req.query.month); }
  const rows = db.prepare(
    `SELECT id, type, title, category, amount, date, note FROM transactions
     WHERE ${where.join(' AND ')} ORDER BY date DESC, id DESC LIMIT ?`).all(...args, limit);
  res.json({ transactions: rows });
});

// POST /api/transactions
router.post('/transactions', (req, res) => {
  const { errors, value } = cleanTransaction(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Form mein ghalti hai.', fields: errors });
  const info = db.prepare(
    'INSERT INTO transactions (user_id, type, title, category, amount, date, note) VALUES (?,?,?,?,?,?,?)'
  ).run(req.user.id, value.type, value.title, value.category, value.amount, value.date, value.note);
  res.status(201).json({ transaction: { id: info.lastInsertRowid, ...value } });
});

// DELETE /api/transactions/:id  (sirf apni entry delete ho sakti hai)
router.delete('/transactions/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Entry nahi mili.' });
  res.json({ ok: true });
});

// GET /api/summary  -> dashboard ke teen cards + recent list
router.get('/summary', (req, res) => {
  const t = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN type='income'  THEN amount END),0) AS income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense,
            COUNT(*) AS count
     FROM transactions WHERE user_id = ?`).get(req.user.id);
  const recent = db.prepare(
    `SELECT id, type, title, category, amount, date FROM transactions
     WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 6`).all(req.user.id);
  res.json({ balance: r2(t.income - t.expense), income: r2(t.income), expense: r2(t.expense), count: t.count, recent });
});

// GET /api/categories
router.get('/categories', (req, res) => res.json({ categories: CATEGORIES }));

// GET /api/reports?months=6  -> monthly comparison + category breakdown
router.get('/reports', (req, res) => {
  const n = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 12);
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const rows = db.prepare(
    `SELECT substr(date,1,7) AS m, type, SUM(amount) AS total FROM transactions
     WHERE user_id = ? AND substr(date,1,7) >= ? AND substr(date,1,7) <= ? GROUP BY m, type`
  ).all(req.user.id, months[0], months[months.length - 1]);
  const monthly = months.map((m) => ({
    month: m,
    income: r2(rows.find((r) => r.m === m && r.type === 'income')?.total),
    expense: r2(rows.find((r) => r.m === m && r.type === 'expense')?.total),
  }));
  const categories = db.prepare(
    `SELECT category, SUM(amount) AS total FROM transactions
     WHERE user_id = ? AND type='expense' AND substr(date,1,7) >= ? AND substr(date,1,7) <= ?
     GROUP BY category ORDER BY total DESC`
  ).all(req.user.id, months[0], months[months.length - 1]).map((c) => ({ category: c.category, total: r2(c.total) }));
  const income = r2(monthly.reduce((s, m) => s + m.income, 0));
  const expense = r2(monthly.reduce((s, m) => s + m.expense, 0));
  res.json({ monthly, categories, totals: { income, expense, net: r2(income - expense) } });
});

module.exports = router;
