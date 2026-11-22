/**
 * FRONTEND - shared helpers (har page par load hota hai)
 * ------------------------------------------------------------
 * F.api()   -> backend (Express) se baat karta hai: fetch('/api/...')
 * F.init()  -> navbar/footer banata hai aur check karta hai user logged-in hai ya nahi
 * Inspector -> neeche "Under the hood" button: har API call live dikhata hai
 */
(function () {
  const ICONS = {
    coffee: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
    bag: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    play: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM10 8l6 4-6 4V8z',
    car: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3 11h18v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM7 14h.01M17 14h.01',
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
    briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    laptop: 'M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9M2 20h20M2 16h20',
    trend: 'M3 3v18h18M7 14l4-4 4 4 5-6',
    gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    plus: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v8M8 12h8',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    bars: 'M12 20V10M18 20V4M6 20v-4',
    wallet: 'M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7M16 13h.01',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  };
  const CAT_ICON = { Food: 'coffee', Shopping: 'bag', Utilities: 'zap', Entertainment: 'play', Transport: 'car', Health: 'heart',
    Education: 'book', Rent: 'home', Salary: 'briefcase', Freelance: 'laptop', Business: 'trend', Gift: 'gift', Other: 'plus' };

  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name] || ICONS.plus}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${+dd} ${MON[+m - 1]} ${y}`; };
  const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${MON[+m - 1]} ${y.slice(2)}`; };
  const today = () => { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); return n.toISOString().slice(0, 10); };

  // ---------------- API client + inspector log ----------------
  const calls = [];
  class ApiError extends Error { constructor(msg, status, fields) { super(msg); this.status = status; this.fields = fields || {}; } }

  async function api(method, url, body) {
    const t0 = performance.now();
    let res, data = {};
    try {
      res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      data = await res.json().catch(() => ({}));
    } catch { log(method, url, 0, performance.now() - t0); throw new ApiError('Server se rabta nahi ho saka. Internet check karein.', 0); }
    log(method, url, res.status, performance.now() - t0);
    if (!res.ok) throw new ApiError(data.error || 'Kuch ghalat ho gaya.', res.status, data.fields);
    return data;
  }
  function log(m, u, s, ms) { calls.unshift({ m, u, s, ms: Math.round(ms) }); calls.length = Math.min(calls.length, 8); renderLog(); }

  // ---------------- UI pieces ----------------
  function toast(msg, type = 'ok') {
    let w = document.querySelector('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; w.setAttribute('role', 'status'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; w.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }
  function clearErrors(form) {
    form.querySelectorAll('.field').forEach((f) => { f.classList.remove('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = ''; });
    const m = form.querySelector('.form-msg'); if (m) { m.className = 'form-msg'; m.textContent = ''; }
  }
  function showErrors(form, fields) {
    let first = null;
    Object.entries(fields || {}).forEach(([name, msg]) => {
      const input = form.querySelector(`[name="${name}"]`); const f = input && input.closest('.field');
      if (f) { f.classList.add('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = msg; first = first || input; }
    });
    if (first) first.focus();
  }
  function formMsg(form, text, kind) { const m = form.querySelector('.form-msg'); if (m) { m.textContent = text; m.className = 'form-msg show ' + kind; } }
  function busy(btn, on, label) { if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Please wait...'; btn.disabled = true; } else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; } }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const V = {
    name: (v) => (v.trim().length >= 2 && v.trim().length <= 60 ? '' : 'Naam kam az kam 2 characters ka ho.'),
    email: (v) => (EMAIL_RE.test(v.trim()) ? '' : 'Sahi email likhein (jaise name@example.com).'),
    password: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Password 8+ characters ka ho, letter aur number dono ke sath.'),
  };

  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#36D1C4"/><path d="M7 21l6-6 4 4 8-9" fill="none" stroke="#06231F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="10" r="2.2" fill="#06231F"/></svg>';

  function buildHeader(user, page) {
    const L = (href, key, label, cls = '') => `<a href="${href}" class="${cls}" ${page === key ? 'aria-current="page"' : ''}>${label}</a>`;
    const links = user
      ? L('/dashboard.html', 'dashboard', 'Dashboard') + L('/expense.html', 'expense', 'Add transaction') + L('/report.html', 'report', 'Reports') +
        L('/profile.html', 'profile', 'Profile') + L('/Aboutus.html', 'about', 'About') + L('/Contactus.html', 'contact', 'Contact') +
        `<span class="nav-user">${esc(user.name.split(' ')[0])}</span><button type="button" id="logout-btn">Log out</button>`
      : L('/home.html', 'home', 'Home') + L('/Aboutus.html', 'about', 'About') + L('/Contactus.html', 'contact', 'Contact') +
        L('/login.html', 'login', 'Log in') + L('/signup.html', 'signup', 'Sign up', 'cta');
    document.getElementById('site-header').innerHTML =
      `<div class="container nav"><a class="brand" href="/home.html">${LOGO}Finora</a>
       <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-links">Menu</button>
       <nav class="nav-links" id="nav-links" aria-label="Main">${links}</nav></div>`;
    const mb = document.querySelector('.menu-btn'), nl = document.getElementById('nav-links');
    mb.addEventListener('click', () => { const o = nl.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });
    const lo = document.getElementById('logout-btn');
    if (lo) lo.addEventListener('click', async () => { try { await api('POST', '/api/auth/logout'); } finally { location.href = '/home.html'; } });
  }
  function buildFooter() {
    document.getElementById('site-footer').innerHTML =
      '<div class="container"><span>&copy; 2024 Finora. All rights reserved.</span><span>info@finora.com &middot; 123 Main Street, Sahiwal, Pakistan</span></div>';
  }

  // ---------------- Inspector ----------------
  function buildInspector() {
    const b = document.createElement('button'); b.className = 'insp-btn'; b.type = 'button'; b.textContent = 'Under the hood'; b.setAttribute('aria-expanded', 'false');
    const p = document.createElement('div'); p.className = 'insp'; p.id = 'insp'; p.setAttribute('role', 'region'); p.setAttribute('aria-label', 'Under the hood');
    p.innerHTML = `<h4>Yeh app andar se kaise chalti hai</h4>
      <div class="flow"><b class="f">Frontend</b>&rarr;<b class="b">Backend</b>&rarr;<b class="d">Database</b></div>
      <p><b>Frontend:</b> yeh page (HTML/CSS/JS) browser mein chal raha hai aur <code>fetch()</code> se request bhejta hai.</p>
      <p><b>Backend:</b> Node.js + Express request ko check karta hai (login cookie, validation) aur SQL chalata hai.</p>
      <p><b>Database:</b> <span id="insp-db">SQLite file mein data permanent save hota hai.</span></p>
      <h4 style="margin-top:12px">Live API calls (is page ki)</h4><div class="log" id="insp-log"></div>`;
    b.addEventListener('click', () => { const o = p.classList.toggle('open'); b.setAttribute('aria-expanded', o); if (o) health(); });
    document.body.append(p, b); renderLog();
  }
  function renderLog() {
    const el = document.getElementById('insp-log'); if (!el) return;
    el.innerHTML = calls.length ? calls.map((c) => `<div><span class="m">${c.m}</span><span>${esc(c.u)}</span><span class="${c.s >= 200 && c.s < 300 ? 's2' : 's4'}">${c.s || 'ERR'}</span><span>${c.ms}ms</span></div>`).join('') : '<p>Abhi koi call nahi hui.</p>';
  }
  async function health() {
    try { const h = await fetch('/api/health').then((r) => r.json()); document.getElementById('insp-db').textContent = `SQLite connected - ${h.users} registered user(s). File: server/data/finora.db`; } catch {}
  }

  async function init(opts = {}) {
    let user = null;
    try { user = (await api('GET', '/api/auth/me')).user; } catch {}
    buildHeader(user, opts.page); buildFooter(); buildInspector();
    return user;
  }

  window.F = { api, ApiError, init, esc, money, fmtDate, monthLabel, today, svg, CAT_ICON, toast, clearErrors, showErrors, formMsg, busy, V };
})();
