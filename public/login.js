const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');
const submitBtn = document.getElementById('submit');
const passwordEl = document.getElementById('password');

function safeNext(param) {
  const n = param || '/';
  if (n.startsWith('/') && !n.startsWith('//') && !/[\r\n\\]/.test(n)) return n;
  return '/';
}

const params = new URLSearchParams(window.location.search);
const next = safeNext(params.get('next'));

function showError(msg) {
  errorEl.hidden = !msg;
  errorEl.textContent = msg || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordEl.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Login failed');
    window.location.href = next;
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
  }
});
