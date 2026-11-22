/**
 * AUTOMATED TESTS  (npm test)   - Node ka built-in test runner, koi extra library nahi.
 * Ek temporary in-memory database par poora backend + page guard + frontend links check hota hai.
 */
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT = '1000';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = require('../server/server');
const db = require('../server/db');

let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = 'http://127.0.0.1:' + server.address().port; r(); }); }));
after(() => server.close());

/** Chhota HTTP client jo cookie yaad rakhta hai (browser ki tarah). */
function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method, redirect: 'manual',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) { const kv = sc.split(';')[0]; cookie = kv.endsWith('=') ? '' : kv; }
    const text = await res.text();
    let json = {}; try { json = JSON.parse(text); } catch { /* html page */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  return { get: (u) => call('GET', u), post: (u, b) => call('POST', u, b), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u) };
}
const good = { name: 'Test User', email: 'test@example.com', password: 'Passw0rd!' };

test('health endpoint reports database', async () => {
  const r = await client().get('/api/health');
  assert.equal(r.status, 200); assert.equal(r.json.database, 'sqlite');
});

test('signup: validation errors per field', async () => {
  const c = client();
  const r = await c.post('/api/auth/signup', { name: 'A', email: 'bad', password: 'short' });
  assert.equal(r.status, 400); assert.ok(r.json.fields.name && r.json.fields.email && r.json.fields.password);
  const nodigit = await c.post('/api/auth/signup', { ...good, password: 'onlyletters' });
  assert.equal(nodigit.status, 400);
});

test('signup: success, cookie is httpOnly, password stored hashed, duplicate rejected', async () => {
  const r = await client().post('/api/auth/signup', good);
  assert.equal(r.status, 201);
  assert.match(r.headers.get('set-cookie'), /HttpOnly/i);
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(good.email);
  assert.notEqual(row.password_hash, good.password);
  assert.match(row.password_hash, /^\$2[aby]\$/);
  const dup = await client().post('/api/auth/signup', { ...good, email: 'TEST@example.com' }); // case-insensitive
  assert.equal(dup.status, 409);
});

test('login: wrong password / unknown email give same 401; correct works; me works', async () => {
  const c = client();
  const a = await c.post('/api/auth/login', { email: good.email, password: 'wrongpass1' });
  const b = await c.post('/api/auth/login', { email: 'nobody@example.com', password: 'wrongpass1' });
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.json.error, b.json.error);
  assert.equal((await c.post('/api/auth/login', good)).status, 200);
  const me = await c.get('/api/auth/me');
  assert.equal(me.status, 200); assert.equal(me.json.user.email, good.email);
  assert.equal(me.json.user.password_hash, undefined);
});

test('logout clears the session', async () => {
  const c = client(); await c.post('/api/auth/login', good);
  await c.post('/api/auth/logout');
  assert.equal((await c.get('/api/auth/me')).status, 401);
});

test('SQL injection attempts do not log in or crash', async () => {
  const r = await client().post('/api/auth/login', { email: "' OR '1'='1", password: "' OR '1'='1" });
  assert.ok([400, 401].includes(r.status));
  const r2 = await client().post('/api/auth/login', { email: "x@y.com' OR 1=1 --", password: 'whatever1' });
  assert.ok([400, 401].includes(r2.status));
});

test('protected API and pages need login', async () => {
  const c = client();
  for (const u of ['/api/summary', '/api/transactions', '/api/reports', '/api/profile']) assert.equal((await c.get(u)).status, 401, u);
  for (const p of ['/dashboard.html', '/expense.html', '/report.html', '/profile.html']) {
    const r = await c.get(p);
    assert.equal(r.status, 302, p); assert.match(r.headers.get('location'), /^\/login\.html/);
  }
  const li = client(); await li.post('/api/auth/login', good);
  assert.equal((await li.get('/dashboard.html')).status, 200);
  assert.equal((await li.get('/login.html')).status, 302); // logged-in user ko login page nahi dikhta
});

test('tampered / garbage cookie is rejected', async () => {
  const res = await fetch(base + '/api/summary', { headers: { cookie: 'finora_token=abc.def.ghi' } });
  assert.equal(res.status, 401);
});

test('transactions: validation, create, list, summary maths, delete', async () => {
  const c = client(); await c.post('/api/auth/login', good);
  const bad = await c.post('/api/transactions', { type: 'expense', title: '', category: 'Salary', amount: -5, date: '2026-13-40' });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.fields.title && bad.json.fields.category && bad.json.fields.amount && bad.json.fields.date);
  const a = await c.post('/api/transactions', { type: 'income', title: 'Pay', category: 'Salary', amount: 1000.5, date: '2026-11-01' });
  const b = await c.post('/api/transactions', { type: 'expense', title: 'Lunch', category: 'Food', amount: 250.25, date: '2026-11-02' });
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  const s = (await c.get('/api/summary')).json;
  assert.equal(s.income, 1000.5); assert.equal(s.expense, 250.25); assert.equal(s.balance, 750.25);
  const l = (await c.get('/api/transactions?type=expense')).json.transactions;
  assert.equal(l.length, 1); assert.equal(l[0].title, 'Lunch');
  assert.equal((await c.del('/api/transactions/' + b.json.transaction.id)).status, 200);
  assert.equal((await c.get('/api/summary')).json.expense, 0);
});

test('data isolation: user B cannot see or delete user A data', async () => {
  const A = client(); await A.post('/api/auth/login', good);
  const t = await A.post('/api/transactions', { type: 'expense', title: 'Secret', category: 'Food', amount: 10, date: '2026-11-03' });
  const B = client(); await B.post('/api/auth/signup', { name: 'Other Person', email: 'other@example.com', password: 'Passw0rd!' });
  assert.equal((await B.get('/api/transactions')).json.transactions.length, 0);
  assert.equal((await B.del('/api/transactions/' + t.json.transaction.id)).status, 404);
  assert.equal((await A.get('/api/transactions?type=expense')).json.transactions.some((x) => x.title === 'Secret'), true);
});

test('reports: monthly array is complete and sums match', async () => {
  const c = client(); await c.post('/api/auth/login', good);
  const r = (await c.get('/api/reports?months=6')).json;
  assert.equal(r.monthly.length, 6);
  assert.equal(r.totals.net, Math.round((r.totals.income - r.totals.expense) * 100) / 100);
});

test('profile: update, email clash, password change, delete account cascades', async () => {
  const c = client(); await c.post('/api/auth/signup', { name: 'Temp User', email: 'temp@example.com', password: 'Passw0rd!' });
  assert.equal((await c.put('/api/profile', { name: 'Temp Renamed', email: 'temp2@example.com' })).status, 200);
  assert.equal((await c.put('/api/profile', { name: 'Temp Renamed', email: good.email })).status, 409);
  assert.equal((await c.put('/api/profile/password', { current: 'nope12345', next: 'NewPass123' })).status, 400);
  assert.equal((await c.put('/api/profile/password', { current: 'Passw0rd!', next: 'weak' })).status, 400);
  assert.equal((await c.put('/api/profile/password', { current: 'Passw0rd!', next: 'NewPass123' })).status, 200);
  assert.equal((await client().post('/api/auth/login', { email: 'temp2@example.com', password: 'NewPass123' })).status, 200);
  await c.post('/api/transactions', { type: 'expense', title: 'x', category: 'Food', amount: 1, date: '2026-11-03' });
  const uid = (await c.get('/api/auth/me')).json.user.id;
  assert.equal((await c.del('/api/profile')).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM transactions WHERE user_id = ?').get(uid).c, 0);
});

test('contact form: validation and storage', async () => {
  const c = client();
  assert.equal((await c.post('/api/contact', { name: 'A', email: 'x', message: 'hi' })).status, 400);
  assert.equal((await c.post('/api/contact', { name: 'Sara Ali', email: 'sara@example.com', message: 'Hello Finora team, great app!' })).status, 201);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM contacts').get().c, 1);
});

test('demo account matches proposal numbers (income 8,200 / expenses 3,500)', async () => {
  const c = client();
  assert.equal((await c.post('/api/auth/login', { email: 'demo@finora.com', password: 'Demo@1234' })).status, 200);
  const s = (await c.get('/api/summary')).json;
  assert.equal(s.income, 8200); assert.equal(s.expense, 3500); assert.equal(s.balance, 4700);
});

test('malformed JSON and unknown API route return clean JSON errors', async () => {
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
  assert.equal((await client().get('/api/nothing')).status, 404);
});

test('security headers present (CSP, no x-powered-by)', async () => {
  const r = await client().get('/home.html');
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('frontend: all 9 pages load and every link / script / stylesheet exists', async () => {
  const pages = ['home', 'login', 'signup', 'dashboard', 'expense', 'report', 'Aboutus', 'profile', 'Contactus'];
  const authed = client(); await authed.post('/api/auth/login', { email: 'demo@finora.com', password: 'Demo@1234' });
  const guest = client();
  const missing = [];
  for (const p of pages) {
    const a = await authed.get(`/${p}.html`); const g = await guest.get(`/${p}.html`);
    assert.ok(a.status === 200 || g.status === 200, p + ' did not load');
    const html = a.status === 200 ? a.text : g.text;
    for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
      if (!fs.existsSync(path.join(__dirname, '..', 'public', m[1]))) missing.push(`${p}: ${m[1]}`);
    }
  }
  // navbar links JS se bante hain - app.js mein likhe har .html link ko bhi check karo
  const appjs = fs.readFileSync(path.join(__dirname, '..', 'public/js/app.js'), 'utf8');
  for (const m of appjs.matchAll(/'(\/[A-Za-z]+\.html)'/g)) {
    if (!fs.existsSync(path.join(__dirname, '..', 'public', m[1]))) missing.push('app.js: ' + m[1]);
  }
  assert.deepEqual(missing, []);
});
