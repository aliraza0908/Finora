(async function () {
  const user = await F.init({ page: 'dashboard' });
  if (!user) return (location.href = '/login.html?next=/dashboard.html');
  const h = new Date().getHours();
  document.getElementById('greeting').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${user.name.split(' ')[0]}`;
  let filter = '';

  async function loadSummary() {
    const s = await F.api('GET', '/api/summary');
    document.getElementById('s-balance').textContent = F.money(s.balance);
    document.getElementById('s-income').textContent = F.money(s.income);
    document.getElementById('s-expense').textContent = F.money(s.expense);
    return s;
  }
  async function loadList() {
    const list = document.getElementById('tx-list');
    const { transactions } = await F.api('GET', '/api/transactions?limit=10' + (filter ? '&type=' + filter : ''));
    if (!transactions.length) {
      list.innerHTML = `<li class="empty"><p>${filter ? 'Is category mein abhi koi entry nahi.' : 'No transactions yet. Add your first income or expense to see it here.'}</p><a class="btn btn-primary" href="/expense.html">Add transaction</a></li>`;
      return;
    }
    list.innerHTML = transactions.map((t) => `
      <li class="tx"><span class="ci ${t.type}">${F.svg(F.CAT_ICON[t.category])}</span>
        <div class="meta"><b>${F.esc(t.title)}</b><small>${F.esc(t.category)} &middot; ${F.fmtDate(t.date)}</small></div>
        <span class="amt ${t.type}">${t.type === 'income' ? '+' : '-'}${F.money(t.amount)}</span>
        <button class="del" data-id="${t.id}" aria-label="Delete ${F.esc(t.title)}">${F.svg('trash')}</button></li>`).join('');
  }
  async function refresh() { try { await Promise.all([loadSummary(), loadList()]); } catch (e) { F.toast(e.message, 'error'); } }

  document.getElementById('filters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('#filters .chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
    loadList().catch((err) => F.toast(err.message, 'error'));
  });
  document.getElementById('tx-list').addEventListener('click', async (e) => {
    const b = e.target.closest('.del'); if (!b || !confirm('Delete this transaction?')) return;
    try { await F.api('DELETE', '/api/transactions/' + b.dataset.id); F.toast('Transaction deleted'); refresh(); } catch (err) { F.toast(err.message, 'error'); }
  });
  refresh();
})();
