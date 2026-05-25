# Deployment plan

This document outlines how to run **soil_sensor** outside your dev machine: at home on a small server, or on a VPS/cloud host reachable from the internet.

The app is a **single Node process** (`server.mjs`) that serves the UI, talks to the Tuya API, polls history into disk (or Postgres), and optionally sends one daily email.

---

## 1. What you are deploying

| Component | Runs in | Notes |
|-----------|---------|--------|
| Express API + static UI | `server.mjs` | Default port `3000` |
| History poller | Same process | Every 5 min unless `HISTORY_POLL=false` |
| Daily email job | Same process | Needs SMTP env; uses server local time |
| Alert config | `data/config.json` | UI/API require `CONFIG_PASSWORD` login |
| History DB | `data/history.db` or Postgres | **Must persist** across restarts |

**Outbound network required:** Tuya Open API (`TUYA_BASE_URL`), and SMTP if using email alerts.

**In repo:** `Dockerfile`, `docker-compose.yml`, `Caddyfile` (see [§4A](#4a-docker-recommended)). Systemd example below for non-Docker installs.

---

## 2. Prerequisites

### Runtime

- **Node.js 22+** recommended (uses built-in `node:sqlite` for history).
- On **Node 20 LTS**, set `DATABASE_URL` to Postgres instead of SQLite (see [history/README.md](history/README.md)).

### Secrets and config

Copy [`.env.example`](.env.example) to `.env` on the server (never commit `.env`).

| Required | Variable |
|----------|----------|
| Yes | `TUYA_BASE_URL`, `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET` |
| One of | `TUYA_UID`, `TUYA_HOME_ID`, `TUYA_SCHEMA`, or `TUYA_DEVICE_IDS` |

| Strongly recommended for any internet-facing deploy | Variable |
|-----------------------------------------------------|----------|
| Yes | `CONFIG_PASSWORD` — required; locks dashboard, APIs, and config UI |
| If public URL | HTTPS in front of the app (reverse proxy); set `TRUST_PROXY=true` behind Caddy/nginx |

### Tuya cloud

1. [Tuya IoT Platform](https://platform.tuya.com/) project with API access.
2. Link Smart Life account; confirm soil sensors appear under **Devices**.
3. Use the same region as your account (`TUYA_BASE_URL`, e.g. `https://openapi.tuyaus.com` for US).

Verify before deploy:

```bash
npm run discover
node discover.mjs <one_device_id>
```

---

## 3. Choose a deployment target

### Option A — Home LAN (simplest)

Run on a Raspberry Pi, NUC, or always-on PC on your home network.

| Pros | Cons |
|------|------|
| No hosting cost | Only reachable at home unless you add VPN/tunnel |
| SQLite file on disk is fine | PC sleep = missed polls/emails |

**Good for:** personal use, phones on Wi‑Fi only.

### Option B — VPS / cloud VM (recommended if you want remote access)

Small Linux VM (e.g. 1 vCPU, 512MB–1GB RAM) with a public IP.

| Pros | Cons |
|------|------|
| Access from anywhere | Monthly cost; you secure it |
| Stable uptime for daily email | Must configure HTTPS + firewall |

**Good for:** checking plants while away, email alerts always on.

### Option C — PaaS (Railway, Fly.io, Render, etc.)

Possible but needs extra care:

- **Disk:** default SQLite path may be **ephemeral** — use a **volume** for `data/` or set `DATABASE_URL` to managed Postgres.
- **Process:** one long-running web service (`npm start`), not serverless per request (poller + scheduler need always-on).
- **Time zone:** set `ALERT_HOUR_LOCAL` knowing the platform’s clock (often UTC).

**Good for:** if you already use that platform and are comfortable with volumes/Postgres.

---

## 4. Recommended path (VPS + HTTPS)

Two ways to run the same architecture (app on port 3000, Caddy on 80/443):

| Method | Best if you… |
|--------|----------------|
| **[4A Docker](#4a-docker-recommended)** | Want reproducible deploys, easy updates, no Node install on the host |
| **[4B Bare metal](#4b-bare-metal-systemd--caddy)** | Prefer systemd directly on the VM |

Both use a **persistent `data/` directory**, **`.env`**, and **Caddy** for TLS.

---

## 4A. Docker (recommended)

Files in the repo: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, optional `docker-compose.local.yml`.

### Phase 1 — Server bootstrap

1. Linux VPS with Docker Engine and Compose plugin installed.
2. Firewall: allow `22`, `80`, `443` (not `3000` publicly).
3. Clone the repo on the server.

### Phase 2 — Configure

```bash
cd soil_sensor
cp .env.example .env
nano .env          # Tuya, CONFIG_PASSWORD, optional SMTP
mkdir -p data
nano Caddyfile     # replace plants.example.com with your domain
```

Point DNS for your domain to the server’s public IP.

### Phase 3 — Run

```bash
docker compose up -d --build
docker compose logs -f app
```

- App: internal only (`expose: 3000`).
- Caddy: publishes `80` and `443`, proxies to `app`.
- `./data` is mounted to `/app/data` (SQLite + `config.json` + alert state).

### Phase 4 — Updates

```bash
git pull
docker compose up -d --build
```

`data/` is unchanged across rebuilds.

### Local Docker (no HTTPS)

On your laptop, app only on localhost:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build app
```

Open http://127.0.0.1:3000 (Caddy service is disabled via profile).

### Docker troubleshooting

| Issue | Fix |
|-------|-----|
| Caddy won’t get a certificate | Domain must resolve to this machine; ports 80/443 reachable |
| Empty charts after deploy | Wait for poller; check `docker compose logs app` for `History: stored` |
| Permission errors on `data/` | `chmod 755 data` or fix volume ownership |
| Node &lt; 22 on host | Irrelevant — image uses `node:22-alpine` |

---

## 4B. Bare metal (systemd + Caddy)

Step-by-step without Docker. Adjust paths if your user or install dir differs.

### Phase 1 — Server bootstrap

1. Create Ubuntu/Debian VM; SSH in.
2. Install Node 22:

   ```bash
   # Example: NodeSource or nvm — use whatever you prefer
   node -v   # must be >= 22 for SQLite default
   ```

3. Install Caddy (or nginx) for HTTPS.

4. Firewall: allow `22`, `80`, `443`; **do not** expose port `3000` publicly if using a reverse proxy.

### Phase 2 — Install app

```bash
sudo mkdir -p /opt/soil_sensor
sudo chown $USER:$USER /opt/soil_sensor
cd /opt/soil_sensor
git clone <your-repo-url> .
npm ci --omit=dev
cp .env.example .env
nano .env   # fill Tuya + CONFIG_PASSWORD + optional SMTP
```

Create persistent data directory:

```bash
mkdir -p /opt/soil_sensor/data
# Optional: HISTORY_DB_PATH=/opt/soil_sensor/data/history.db
# Optional: CONFIG_PATH=/opt/soil_sensor/data/config.json
```

Smoke test:

```bash
npm start
# From laptop: ssh -L 3000:localhost:3000 user@server → open http://localhost:3000
```

### Phase 3 — Process manager (systemd)

Create `/etc/systemd/system/soil_sensor.service`:

```ini
[Unit]
Description=Soil sensor dashboard
After=network.target

[Service]
Type=simple
User=soil
WorkingDirectory=/opt/soil_sensor
EnvironmentFile=/opt/soil_sensor/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.mjs
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now soil_sensor
sudo journalctl -u soil_sensor -f
```

### Phase 4 — HTTPS reverse proxy (Caddy)

Example `Caddyfile` site block:

```caddy
plants.example.com {
    reverse_proxy localhost:3000
}
```

Caddy obtains TLS automatically. Set `NODE_ENV=production` so auth cookies can use `Secure` when you extend cookie logic for HTTPS.

### Phase 5 — Post-deploy checks

| Check | How |
|-------|-----|
| UI loads | `https://plants.example.com/` |
| Live data | Refresh; sensors show moisture |
| Auth | Open `/` or `/config.html` → login required |
| History | Enable plots; 7-day chart has points after ~1 day |
| Email | `npm run alert:once` on server (with SMTP set) |
| Logs | `journalctl -u soil_sensor` — poller lines every 5 min |

---

## 5. Persistence and backups

| File | Backup? |
|------|---------|
| `data/config.json` | Yes — alert thresholds |
| `data/history.db` | Yes — charts (can grow; plan disk) |
| `data/alert-state.json` | Optional — only affects duplicate email same day |
| `.env` | Store in password manager / secret store, not only on disk |

**Restore:** copy files back with the **same Tuya account** so device IDs still match.

For Postgres (`DATABASE_URL`): use provider backups; migrate schema from [history/store.mjs](history/store.mjs).

---

## 6. Security checklist

- [ ] `CONFIG_PASSWORD` set to a long random value (required to start the server).
- [ ] `.env` permissions `600`; not in git.
- [ ] HTTPS on public hostname; no plain HTTP for login.
- [ ] `TRUST_PROXY=true` when behind Caddy/nginx (enables correct client IP for login rate limiting).
- [ ] Reverse proxy only; block direct public access to `:3000` if possible.
- [ ] Tuya API keys rotated if ever leaked.
- [ ] SMTP app password (not main mailbox password) for Gmail etc.
- [ ] Consider VPN or Tailscale instead of a fully public URL if only you need access.

The app **always** requires login for the dashboard, sensor APIs, and config (except `/api/health` and the login page). `CONFIG_PASSWORD` must be set in `.env` before `npm start`.

---

## 7. Environment reference (production)

| Variable | Production note |
|----------|-----------------|
| `PORT` | Keep `3000` behind proxy, or set to what proxy targets |
| `NODE_ENV` | `production` |
| `CONFIG_PASSWORD` | Required |
| `TRUST_PROXY` | `true` behind reverse proxy |
| `DATABASE_URL` | Use on PaaS or if not using Node 22 + persistent volume |
| `HISTORY_DB_PATH` | Absolute path on persistent disk |
| `CONFIG_PATH` | Absolute path for `config.json` |
| `POLL_INTERVAL_MS` | Default 300000 (5 min); lower = more Tuya API calls |
| `ALERT_HOUR_LOCAL` | Hour in **server local timezone** (set TZ in systemd if needed) |
| `ALERT_EMAIL_*` / `SMTP_*` | Required for daily emails |

---

## 8. Updates and rollback

```bash
cd /opt/soil_sensor
git pull
npm ci --omit=dev
sudo systemctl restart soil_sensor
```

Rollback: `git checkout <previous-tag>` then restart. Keep `data/` untouched across deploys.

---

## 9. Optional follow-ups

1. **CI** — build image on push; deploy to VPS via SSH or registry pull.
2. **Registry** — push to GHCR/Docker Hub instead of `build` on the server.
3. **Stronger auth** — SSO, per-user accounts, or IP allowlist at the proxy.
4. **Monitoring** — uptime ping on `/api/health`; alert if poller stops logging.

---

## 10. Quick decision matrix

| Goal | Suggested approach |
|------|-------------------|
| Use only at home | Option A, `npm start` or systemd, SQLite |
| Phone access anywhere | Option B + Docker (§4A) or Caddy + `CONFIG_PASSWORD` |
| Minimal ops | Home server + Tailscale (no public URL) |
| Managed DB / no local disk | `DATABASE_URL` + Postgres on PaaS |
| Test email only | `npm run alert:once` after SMTP in `.env` |

---

## 11. Pre-launch checklist

- [ ] `.env` complete; `npm run discover` works on the server
- [ ] `data/` on persistent storage
- [ ] `CONFIG_PASSWORD` set
- [ ] HTTPS working
- [ ] systemd (or equivalent) restart on reboot
- [ ] Alert thresholds saved via config UI once
- [ ] One manual `alert:once` email received
- [ ] README and folder docs reviewed with anyone else operating the system

After this plan is executed, link your live URL in the main [README.md](README.md) if desired (optional).
