(async function () {
  const user = await F.init({ page: 'expense' });
  if (!user) return (location.href = '/login.html?next=/expense.html');
  const form = document.getElementById('tx-form');
  const { categories } = await F.api('GET', '/api/categories'); // categories backend se aati hain (ek hi source of truth)
  form.date.value = F.today();

  function syncType() {
    const type = form.type.value;
    form.category.innerHTML = categories[type].map((c) => `<option>${c}</option>`).join('');
    document.getElementById('title-label').textContent = type === 'income' ? 'Where did it come from?' : 'Where did you spend?';
    form.title.placeholder = type === 'income' ? 'e.g. Monthly salary' : 'e.g. Al-Fatah groceries';
  }
  form.querySelectorAll('input[name=type]').forEach((r) => r.addEventListener('change', syncType));
  syncType();

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); F.clearErrors(form);
    const f = {};
    if (!form.title.value.trim()) f.title = 'Title likhein.';
    if (!(Number(form.amount.value) > 0)) f.amount = 'Amount 0 se zyada hona chahiye.';
    if (!form.date.value) f.date = 'Date chunein.';
    if (Object.keys(f).length) return F.showErrors(form, f);
    const btn = form.querySelector('button[type=submit]'); F.busy(btn, true, 'Saving...');
    try {
      const body = { type: form.type.value, title: form.title.value, amount: form.amount.value, date: form.date.value, category: form.category.value, note: form.note.value };
      await F.api('POST', '/api/transactions', body);
      F.busy(btn, false); F.toast('Transaction saved');
      setTimeout(() => (location.href = '/dashboard.html'), 700);
    } catch (err) { F.busy(btn, false); F.formMsg(form, err.message, 'error'); F.showErrors(form, err.fields); }
  });
})();
