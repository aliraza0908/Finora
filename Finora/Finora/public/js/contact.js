(async function () {
  const user = await F.init({ page: 'contact' });
  const form = document.getElementById('contact-form');
  if (user) { form.name.value = user.name; form.email.value = user.email; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); F.clearErrors(form);
    const f = {}; const n = F.V.name(form.name.value), m = F.V.email(form.email.value);
    if (n) f.name = n; if (m) f.email = m;
    if (form.message.value.trim().length < 10) f.message = 'Message kam az kam 10 characters ka ho.';
    if (Object.keys(f).length) return F.showErrors(form, f);
    const btn = form.querySelector('button[type=submit]'); F.busy(btn, true, 'Sending...');
    try { await F.api('POST', '/api/contact', { name: form.name.value, email: form.email.value, message: form.message.value }); form.message.value = ''; F.formMsg(form, 'Thank you! Your message has been received.', 'ok'); }
    catch (err) { F.formMsg(form, err.message, 'error'); F.showErrors(form, err.fields); }
    F.busy(btn, false);
  });
})();
