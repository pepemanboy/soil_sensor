# soil_sensor

Local dashboard for Tuya / Smart Life Zigbee soil moisture sensors. Reads live status from the Tuya Open API, stores history locally, and can email a daily alert when plants need attention.

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

### Docker production (VPS + HTTPS)

```bash
cp .env.example .env   # edit: Tuya, CONFIG_PASSWORD, SMTP optional
mkdir -p data
# edit Caddyfile with your domain, then:
docker compose up -d --build
```

See [deployment.md](deployment.md) for the full VPS + HTTPS plan.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Web UI + API + history poller + daily email scheduler |
| `npm run discover` | Test device discovery (`node discover.mjs [device_id]`) |
| `npm run query` | Print sensor status in the terminal |
| `npm run poll` | Run history poller standalone |
| `npm run poll:once` | Store one history snapshot and exit |
| `npm run alert:once` | Send the daily alert email now (for testing) |

## Features

- **Dashboard** — moisture, temperature, battery; sort by moisture, number, battery, or offline
- **Charts** — optional 24h / 7d / 30d history per sensor
- **Alert config** — global low-battery %, default low-moisture %, per-plant overrides (keyed by device ID, not name)
- **Daily email** — plants below moisture threshold, low battery, or offline (SMTP in `.env`)
- **Auth** — `CONFIG_PASSWORD` (required) protects the dashboard, APIs, and alert config

## Project layout

| Path | Purpose |
|------|---------|
| [`server.mjs`](server.mjs) | Process entry (calls [`app.mjs`](app.mjs)) |
| [`app.mjs`](app.mjs) | Wire Express, pollers, schedulers, static UI |
| [`api/`](api/routes.mjs) | HTTP routes and error mapping |
| [`tuya/`](tuya/context.mjs) | Tuya client, device discovery, live snapshot |
| [`metrics.mjs`](metrics.mjs) | Shared metric / plant-name parsing |
| [`auth.mjs`](auth.mjs) | Password gate for the whole app (`CONFIG_PASSWORD`) |
| [`lib/`](lib/paths.mjs) | Project/data paths (`DATA_DIR` override) |
| [`public/`](public/README.md) | Static HTML/JS UI |
| [`config/`](config/README.md) | Alert thresholds on disk |
| [`history/`](history/README.md) | SQLite/Postgres readings + poller |
| [`alerts/`](alerts/README.md) | Evaluate rules and send email |
| [`data/`](data/README.md) | Runtime files (gitignored except this README) |

## Environment

See [`.env.example`](.env.example) for Tuya, history DB, `CONFIG_PASSWORD`, and SMTP settings.

Plant names like `3 - Fern` are parsed in the UI for display and sorting; history and config always use **device ID**.

## CLI helpers

```bash
node discover.mjs              # list discovery config status
node discover.mjs <device_id>  # test one device
node query-sensors.mjs         # print current readings
```
