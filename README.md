# soil_sensor

Dashboard for Tuya / Smart Life Zigbee soil moisture sensors. Hosted on **Vercel** with **Neon** Postgres.

## Setup

1. Copy `.env.example` to `.env` and fill in Tuya credentials, `DATABASE_URL` (Neon), `CONFIG_PASSWORD`, and `CRON_SECRET`.
2. Initialize the database:

```bash
npm install
npm run db:schema
```

3. Run locally (same as production):

```bash
npm run dev
```

Open the URL Vercel prints (usually http://localhost:3000). Sign in with `CONFIG_PASSWORD`.

Deploy and env vars: **[deployment.md](deployment.md)**.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | `vercel dev` — local serverless + static UI |
| `npm run db:schema` | Create Neon tables + default config |

## Layout

| Path | Purpose |
|------|---------|
| [`api/index.js`](api/index.js) | All `/api/*` routes (except cron) |
| [`api/cron/poll.js`](api/cron/poll.js) | History polling endpoint |
| [`api/dispatch.mjs`](api/dispatch.mjs) | Route logic |
| [`middleware.js`](middleware.js) | Redirect unauthenticated users to login |
| [`public/`](public/) | Dashboard UI |
| [`tuya/`](tuya/context.mjs) | Tuya API client |
| [`lib/db.mjs`](lib/db.mjs) | Neon schema + pool |

Plant names like `3 - Fern` are parsed in the UI; history and config use **device ID**.
