# public/

Static web UI served by Express at `/`.

## Pages

| File | URL | Description |
|------|-----|-------------|
| `index.html` + `app.js` | `/` | Sensor list, sorting, optional Chart.js plots |
| `config.html` + `config.js` | `/config.html` | Alert thresholds (login required) |
| `login.html` + `login.js` | `/login.html` | Sign-in form |

## API usage (from the browser)

- `GET /api/snapshot` — devices + live status (main page)
- `GET /api/history?device_id=&code=&hours=` — chart data
- `GET` / `PUT /api/config` — load/save alert settings
- `POST /api/login` — set auth cookie
- `POST /api/logout` — clear auth cookie

All routes except login and `/api/health` require a valid session cookie.

No build step; refresh the browser after edits.
