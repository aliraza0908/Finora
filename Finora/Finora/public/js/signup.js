(async function () {
  await F.init({ page: 'signup' });
  const form = document.getElementById('signup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); F.clearErrors(form);
    const f = {};
    const set = (k, v) => { if (v) f[k] = v; };
    set('name', F.V.name(form.name.value)); set('email', F.V.email(form.email.value)); set('password', F.V.password(form.password.value));
    if (!f.password && form.confirm.value !== form.password.value) f.confirm = 'Dono passwords match nahi karte.';
    if (Object.keys(f).length) return F.showErrors(form, f);
    const btn = form.querySelector('button[type=submit]'); F.busy(btn, true, 'Creating account...');
    try {
      await F.api('POST', '/api/auth/signup', { name: form.name.value, email: form.email.value, password: form.password.value });
      location.href = '/dashboard.html';
    } catch (err) { F.busy(btn, false); F.formMsg(form, err.message, 'error'); F.showErrors(form, err.fields); }
  });
})();
