# public/

Static UI served by Vercel.

| File | URL | Description |
|------|-----|-------------|
| `index.html` + `app.js` | `/` | Sensor list, charts |
| `config.html` + `config.js` | `/config.html` | Alert thresholds |
| `login.html` + `login.js` | `/login.html` | Sign-in |
| `auth-guard.js` | (inline) | Redirect if not logged in |

API: `/api/snapshot`, `/api/config`, `/api/history`, `/api/login`, `/api/logout`, `/api/health`.

No build step.
