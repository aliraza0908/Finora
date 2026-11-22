/** Demo account: demo@finora.com / Demo@1234  (proposal ke numbers: Income 8,200 | Expense 3,500) */
const bcrypt = require('bcryptjs');
const db = require('./db');

function monthDate(offset, day) {
  const n = new Date();
  const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + offset, day));
  return d.toISOString().slice(0, 10);
}

function ensureDemo() {
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get('demo@finora.com')) return false;
  const uid = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
    .run('Ayesha Khan', 'demo@finora.com', bcrypt.hashSync('Demo@1234', 10)).lastInsertRowid;
  const ins = db.prepare('INSERT INTO transactions (user_id,type,title,category,amount,date) VALUES (?,?,?,?,?,?)');
  const rows = [
    ['income', 'Monthly salary', 'Salary', 1800, -2, 1],
    ['income', 'Monthly salary', 'Salary', 2000, -1, 1],
    ['income', 'Logo design project', 'Freelance', 1000, -1, 14],
    ['income', 'Monthly salary', 'Salary', 2200, 0, 1],
    ['income', 'Website project', 'Freelance', 1200, 0, 3],
    ['expense', 'Imtiaz Super Market', 'Food', 300, -2, 6],
    ['expense', 'House rent', 'Rent', 400, -2, 2],
    ['expense', 'Savour Foods', 'Food', 350, -1, 9],
    ['expense', 'Electricity bill', 'Utilities', 280, -1, 12],
    ['expense', 'Outfitters', 'Shopping', 420, -1, 20],
    ['expense', 'Al-Fatah', 'Food', 380, 0, 2],
    ['expense', 'Gas & internet', 'Utilities', 320, 0, 2],
    ['expense', 'Cinepax', 'Entertainment', 250, 0, 2],
    ['expense', 'Careem rides', 'Transport', 200, 0, 1],
    ['expense', 'Khaadi', 'Shopping', 600, 0, 1],
  ];
  db.transaction(() => rows.forEach(([t, title, c, a, mo, day]) => {
    let date = monthDate(mo, day);
    if (date > new Date().toISOString().slice(0, 10)) date = new Date().toISOString().slice(0, 10); // future date na ho
    ins.run(uid, t, title, c, a, date);
  }))();
  return true;
}
module.exports = { ensureDemo };
if (require.main === module) console.log(ensureDemo() ? 'Demo account bana diya.' : 'Demo account pehle se hai.');
