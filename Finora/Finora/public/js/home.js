(async function () {
  const user = await F.init({ page: 'home' });
  if (user) document.getElementById('hero-actions').innerHTML = '<a class="btn btn-primary" href="/dashboard.html">Open your dashboard</a><a class="btn" href="/expense.html">Add a transaction</a>';

  const sample = [['Salary', 'Monthly salary', '+PKR 2,200.00', 'income'], ['Food', 'Al-Fatah', '-PKR 380.00', 'expense'], ['Freelance', 'Website project', '+PKR 1,200.00', 'income']];
  document.getElementById('glance-list').innerHTML = sample.map(([c, t, a, k]) =>
    `<li class="tx"><span class="ci ${k}">${F.svg(F.CAT_ICON[c])}</span><div class="meta"><b>${t}</b><small>${c}</small></div><span class="amt ${k}">${a}</span></li>`).join('');

  const feats = [
    ['wallet', 'Income and expenses', 'Log salaries, freelance payments and daily spending with a category and date.'],
    ['layers', 'A live dashboard', 'Total balance, income, expenses and your latest transactions on one screen.'],
    ['bars', 'Monthly reports', 'Compare income against expenses month by month and see where money goes.'],
    ['lock', 'Private accounts', 'Passwords are hashed and every account only ever sees its own data.'],
    ['shield', 'Checked input', 'Every form is validated, so wrong amounts and dates never reach your records.'],
    ['trend', 'Works on any screen', 'A responsive layout that feels the same on a phone, tablet or laptop.'],
  ];
  document.getElementById('features').innerHTML = feats.map(([i, t, d]) => `<article class="card feature"><div class="ico">${F.svg(i)}</div><h3>${t}</h3><p>${d}</p></article>`).join('');
})();
