(async function () {
  const user = await F.init({ page: 'profile' });
  if (!user) return (location.href = '/login.html?next=/profile.html');
  const info = document.getElementById('info-form'), pw = document.getElementById('pw-form');

  function paint(u, stats) {
    document.getElementById('avatar').textContent = u.name.trim().charAt(0).toUpperCase();
    document.getElementById('p-name').textContent = u.name; document.getElementById('p-email').textContent = u.email;
    document.getElementById('p-since').textContent = F.fmtDate(u.created_at.slice(0, 10));
    if (stats) document.getElementById('p-count').textContent = stats.transactions + ' transactions';
    info.name.value = u.name; info.email.value = u.email;
  }
  const { user: u, stats } = await F.api('GET', '/api/profile'); paint(u, stats);

  info.addEventListener('submit', async (e) => {
    e.preventDefault(); F.clearErrors(info);
    const f = {}; const n = F.V.name(info.name.value), m = F.V.email(info.email.value);
    if (n) f.name = n; if (m) f.email = m;
    if (Object.keys(f).length) return F.showErrors(info, f);
    const btn = info.querySelector('button'); F.busy(btn, true, 'Saving...');
    try { const r = await F.api('PUT', '/api/profile', { name: info.name.value, email: info.email.value }); paint(r.user); F.toast('Profile updated'); }
    catch (err) { F.formMsg(info, err.message, 'error'); F.showErrors(info, err.fields); }
    F.busy(btn, false);
  });

  pw.addEventListener('submit', async (e) => {
    e.preventDefault(); F.clearErrors(pw);
    const f = {}; if (!pw.current.value) f.current = 'Maujooda password likhein.'; const p = F.V.password(pw.next.value); if (p) f.next = p;
    if (Object.keys(f).length) return F.showErrors(pw, f);
    const btn = pw.querySelector('button'); F.busy(btn, true, 'Updating...');
    try { await F.api('PUT', '/api/profile/password', { current: pw.current.value, next: pw.next.value }); pw.reset(); F.toast('Password updated'); }
    catch (err) { F.formMsg(pw, err.message, 'error'); F.showErrors(pw, err.fields); }
    F.busy(btn, false);
  });

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm('Delete your account and all your data permanently?')) return;
    try { await F.api('DELETE', '/api/profile'); location.href = '/home.html'; } catch (err) { F.toast(err.message, 'error'); }
  });
})();
