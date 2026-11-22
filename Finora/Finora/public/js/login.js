(async function () {
  await F.init({ page: 'login' });
  const form = document.getElementById('login-form');
  const fill = () => { form.email.value = 'demo@finora.com'; form.password.value = 'Demo@1234'; };
  document.getElementById('fill-demo').addEventListener('click', fill);
  if (new URLSearchParams(location.search).get('demo')) fill();

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); F.clearErrors(form);
    const fields = {};
    if (F.V.email(form.email.value)) fields.email = F.V.email(form.email.value);
    if (!form.password.value) fields.password = 'Password likhein.';
    if (Object.keys(fields).length) return F.showErrors(form, fields);
    const btn = form.querySelector('button[type=submit]'); F.busy(btn, true, 'Logging in...');
    try {
      await F.api('POST', '/api/auth/login', { email: form.email.value, password: form.password.value });
      const next = new URLSearchParams(location.search).get('next');
      location.href = next && /^\/[A-Za-z0-9_-]+\.html$/.test(next) ? next : '/dashboard.html'; // sirf apni site ke pages (open-redirect se bachao)
    } catch (err) { F.busy(btn, false); F.formMsg(form, err.message, 'error'); }
  });
})();
