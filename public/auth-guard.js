/** Redirect to login before the dashboard loads (Express + Vercel). */
(async () => {
  try {
    const res = await fetch('/api/config', { credentials: 'same-origin' });
    if (res.status === 401) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login.html?next=${next}`);
    }
  } catch {
    /* network error — app.js will show an error */
  }
})();
