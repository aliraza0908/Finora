/** Server-side validation (frontend ki validation par kabhi bharosa nahi karte). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CATEGORIES = {
  income:  ['Salary', 'Freelance', 'Business', 'Gift', 'Other'],
  expense: ['Food', 'Shopping', 'Utilities', 'Entertainment', 'Transport', 'Health', 'Education', 'Rent', 'Other'],
};

function validName(v)  { return typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 60; }
function validEmail(v) { return typeof v === 'string' && v.length <= 120 && EMAIL_RE.test(v.trim()); }
function validPassword(v) {
  return typeof v === 'string' && v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v);
}
const PASSWORD_RULE = 'Password kam az kam 8 characters ka ho, us mein letter aur number dono hon.';

function validDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === v;
}

/** Transaction body ko check karke saaf-suthra object (ya errors) return karta hai. */
function cleanTransaction(b = {}) {
  const errors = {};
  const type = b.type;
  if (!['income', 'expense'].includes(type)) errors.type = 'Type income ya expense hona chahiye.';
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (title.length < 1 || title.length > 80) errors.title = 'Title 1 se 80 characters ka hona chahiye.';
  if (type && !CATEGORIES[type]?.includes(b.category)) errors.category = 'Category sahi nahi hai.';
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) errors.amount = 'Amount 0 se zyada hona chahiye.';
  if (!validDate(b.date)) errors.date = 'Date sahi nahi hai (YYYY-MM-DD).';
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 200) : '';
  return {
    errors,
    value: { type, title, category: b.category, amount: Math.round(amount * 100) / 100, date: b.date, note },
  };
}

module.exports = { CATEGORIES, validName, validEmail, validPassword, PASSWORD_RULE, validDate, cleanTransaction };
