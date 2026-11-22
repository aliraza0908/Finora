(async function () {
  const user = await F.init({ page: 'report' });
  if (!user) return (location.href = '/login.html?next=/report.html');
  let months = 6;

  async function load() {
    try {
      const r = await F.api('GET', '/api/reports?months=' + months);
      document.getElementById('r-income').textContent = F.money(r.totals.income);
      document.getElementById('r-expense').textContent = F.money(r.totals.expense);
      const net = document.getElementById('r-net');
      net.textContent = F.money(r.totals.net); net.className = 'val ' + (r.totals.net >= 0 ? 'net-pos' : 'net-neg');

      // Monthly comparison chart (pure HTML/CSS - koi external library nahi, isliye offline bhi chalta hai)
      const max = Math.max(1, ...r.monthly.flatMap((m) => [m.income, m.expense]));
      const empty = r.monthly.every((m) => !m.income && !m.expense);
      document.getElementById('chart').innerHTML = empty
        ? '<div class="empty"><p>No data in this period yet. Add a few transactions to see your comparison.</p><a class="btn btn-primary" href="/expense.html">Add transaction</a></div>'
        : '<div class="chart">' + r.monthly.map((m, i) => `<div class="grp"><div class="bars">
            <div class="bar i" style="height:${(m.income / max) * 100}%;animation-delay:${i * 60}ms" data-tip="${F.monthLabel(m.month)} income: ${F.money(m.income)}"></div>
            <div class="bar e" style="height:${(m.expense / max) * 100}%;animation-delay:${i * 60 + 30}ms" data-tip="${F.monthLabel(m.month)} expenses: ${F.money(m.expense)}"></div></div></div>`).join('') + '</div>';
      document.getElementById('chart-labels').innerHTML = empty ? '' : r.monthly.map((m) => `<span>${F.monthLabel(m.month)}</span>`).join('');

      const total = r.categories.reduce((s, c) => s + c.total, 0);
      document.getElementById('cats').innerHTML = r.categories.length
        ? r.categories.map((c) => `<div class="cat-row"><div class="h"><span>${F.esc(c.category)}</span><span>${F.money(c.total)} <span class="muted">(${Math.round((c.total / total) * 100)}%)</span></span></div><div class="track"><i style="width:${(c.total / total) * 100}%"></i></div></div>`).join('')
        : '<p class="muted">No expenses recorded in this period.</p>';
    } catch (e) { F.toast(e.message, 'error'); }
  }
  document.getElementById('range').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    months = +b.dataset.m; document.querySelectorAll('#range .chip').forEach((c) => c.setAttribute('aria-pressed', c === b)); load();
  });
  load();
})();
