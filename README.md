# soil_sensor

Local dashboard for Tuya / Smart Life Zigbee soil moisture sensors. Reads live status from the Tuya Open API and stores history locally.

## Quick start

1. Copy `.env.example` to `.env` and fill in Tuya credentials (see [Tuya IoT Platform](https://platform.tuya.com/)).
2. Set **one** device discovery option: `TUYA_UID`, `TUYA_HOME_ID`, `TUYA_SCHEMA`, or `TUYA_DEVICE_IDS`.
3. Install and run:

```bash
npm install
npm start
```

Open http://localhost:3000

### Docker local (Docker Desktop)

Use this to run the same stack as production without installing Node on the host. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

1. Copy `.env.example` to `.env` and fill in Tuya credentials plus `CONFIG_PASSWORD`.
2. Create the data directory (SQLite + config persist here):

```bash
mkdir -p data
```

3. Start the app container (no Caddy; binds to localhost only):

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build app
```

4. Open **http://127.0.0.1:3000** — sign in with `CONFIG_PASSWORD` if prompted.

**Useful commands**

```bash
# Follow logs
docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f app

# Stop and remove container (keeps data/)
docker compose -f docker-compose.yml -f docker-compose.local.yml down

# Rebuild after code changes
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build app
```

**Notes**

- Stop any `npm start` on port 3000 first, or Docker cannot bind the port.
- `.env` and `./data` are mounted into the container; edits on the host apply after restart.
- Health check (no login): http://127.0.0.1:3000/api/health

### Production (Vercel + Neon)

Hosted API, static UI, Postgres history, and a cron poller — no server to maintain.

See **[deployment.md](deployment.md)** for Neon setup, Vercel env vars, and cron configuration.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Local Express: UI + API + in-process history poller |
| `npm run dev` | Vercel dev server (serverless API routes) |
| `npm run db:schema` | Create Neon tables + default config (needs `DATABASE_URL`) |

## Features

- **Dashboard** — moisture, temperature, battery; sort by moisture, number, battery, or offline
- **Charts** — optional 24h / 7d / 30d history per sensor
- **Alert config** — global low-battery %, default low-moisture %, per-plant overrides (keyed by device ID, not name)
- **Auth** — `CONFIG_PASSWORD` (required) protects the dashboard, APIs, and alert config

## Project layout

| Path | Purpose |
|------|---------|
| [`server.mjs`](server.mjs) | Process entry (calls [`app.mjs`](app.mjs)) |
| [`app.mjs`](app.mjs) | Wire Express, poller, static UI |
| [`api/`](api/routes.mjs) | HTTP routes and error mapping |
| [`tuya/`](tuya/context.mjs) | Tuya client, device discovery, live snapshot |
| [`metrics.mjs`](metrics.mjs) | Shared metric / plant-name parsing |
| [`auth.mjs`](auth.mjs) | Password gate for the whole app (`CONFIG_PASSWORD`) |
| [`lib/`](lib/paths.mjs) | Project/data paths (`DATA_DIR` override) |
| [`public/`](public/README.md) | Static HTML/JS UI |
| [`config/`](config/README.md) | Alert thresholds (file locally, Postgres on Vercel) |
| [`history/`](history/README.md) | SQLite (local) or Neon readings + poller/cron |
| [`api/`](api/dispatch.mjs) | Vercel serverless handlers + Express routes |
| [`data/`](data/README.md) | Runtime files (gitignored except this README) |

## Environment

See [`.env.example`](.env.example) for Tuya, history DB, and `CONFIG_PASSWORD`.

Plant names like `3 - Fern` are parsed in the UI for display and sorting; history and config always use **device ID**.

