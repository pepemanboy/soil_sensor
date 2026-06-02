# soil_sensor

Dashboard for Tuya / Smart Life Zigbee soil moisture sensors. Live readings, history charts, and per-plant alert thresholds.

**Production:** [Vercel](https://vercel.com) + [Neon](https://neon.tech) — see **[deployment.md](deployment.md)**.

**Local dev:** Node + Express (optional SQLite, or same Neon DB as production).

---

## Quick start (local)

1. Copy `.env.example` to `.env` and fill in:
   - Tuya credentials ([Tuya IoT Platform](https://platform.tuya.com/))
   - One of `TUYA_UID`, `TUYA_HOME_ID`, `TUYA_SCHEMA`, or `TUYA_DEVICE_IDS`
   - `CONFIG_PASSWORD`
   - `DATABASE_URL` (Neon) — recommended so local matches production
2. Initialize the database (first time, with `DATABASE_URL` set):

```bash
npm install
npm run db:schema
```

3. Run:

```bash
npm start
```

Open http://localhost:3000 and sign in with `CONFIG_PASSWORD`.

**Without `DATABASE_URL`:** uses SQLite in `data/history.db` and `data/config.json` instead (fine for quick tests).

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Local server: UI + API + history poller |
| `npm run dev` | `vercel dev` — serverless routes like production |
| `npm run db:schema` | Create Neon tables + default config |

---

## Features

- **Dashboard** — moisture, temperature, battery; several sort options
- **Charts** — 24h / 7d / 30d history per sensor
- **Settings** — low-battery %, default moisture %, per-device overrides (by device ID)
- **Auth** — `CONFIG_PASSWORD` protects UI and APIs

---

## Project layout

| Path | Purpose |
|------|---------|
| [`server.mjs`](server.mjs) | Local entry → [`app.mjs`](app.mjs) |
| [`app.mjs`](app.mjs) | Express, poller, static UI |
| [`api/`](api/dispatch.mjs) | Vercel serverless + Express routes |
| [`tuya/`](tuya/context.mjs) | Tuya client, devices, snapshot |
| [`public/`](public/README.md) | Dashboard UI |
| [`config/`](config/README.md) | Alert thresholds |
| [`history/`](history/README.md) | Readings store + poller |
| [`lib/db.mjs`](lib/db.mjs) | Neon schema + pool |

---

## Environment

See [`.env.example`](.env.example). Plant names like `3 - Fern` are parsed in the UI; history and config use **device ID**.
