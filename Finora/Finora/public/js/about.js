(async function () {
  await F.init({ page: 'about' });
  const feats = [['wallet', 'Income management', 'Record salaries, freelance payments and business earnings with a date and category.'],
    ['bars', 'Expense tracking', 'Log daily spending across food, shopping, utilities and more.'],
    ['layers', 'Financial dashboard', 'Balance, income, expenses and recent activity at a glance.']];
  document.getElementById('about-features').innerHTML = feats.map(([i, t, d]) => `<article class="card feature"><div class="ico">${F.svg(i)}</div><h3>${t}</h3><p>${d}</p></article>`).join('');
})();
