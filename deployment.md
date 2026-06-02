# Deployment (Vercel + Neon)

Run the dashboard on **Vercel** (serverless API + static UI) and **Neon** (Postgres for history and alert config). No VPS or Raspberry Pi required.

---

## Architecture

| Piece | Where | Role |
|-------|--------|------|
| Static UI | Vercel `public/` | Dashboard, login, config pages |
| API | Vercel serverless `api/` | Tuya snapshot, config, history |
| History poller | Vercel Cron → `/api/cron/poll` | Every 5 minutes (Pro plan; see below) |
| Database | Neon Postgres | `readings` + `app_config` tables |

---

## 1. Neon database

1. In [Neon](https://neon.tech), create a project and database.
2. Copy the **connection string** from the dashboard.
3. Prefer the **pooled** host (`…-pooler.…`) for serverless — many short-lived Vercel functions share connections better.
4. Append `?sslmode=require` if it is not already in the URL.

Initialize tables (from your machine, with the connection string in `.env`):

```bash
# .env
DATABASE_URL=postgresql://...@ep-xxx-pooler....neon.tech/neondb?sslmode=require

npm install
npm run db:schema
```

This creates `readings` and `app_config` and seeds default alert thresholds.

---

## 2. Tuya credentials

Same as local development — see [`.env.example`](.env.example):

- `TUYA_BASE_URL`, `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`
- One of `TUYA_UID`, `TUYA_HOME_ID`, `TUYA_SCHEMA`, or `TUYA_DEVICE_IDS`

---

## 3. Deploy to Vercel

1. Push the repo to GitHub (if not already).
2. [Import the project](https://vercel.com/new) in Vercel and link the repository.
3. Framework preset: **Other** (no build command needed).
4. Add **Environment variables** (Production, and Preview if you want):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon connection string (pooled recommended) |
| `CONFIG_PASSWORD` | Yes | Dashboard / API password |
| `CRON_SECRET` | Yes | Random string; external cron calls `/api/cron/poll` with `Authorization: Bearer <value>` |
| `TUYA_BASE_URL` | Yes | e.g. `https://openapi.tuyaus.com` |
| `TUYA_ACCESS_ID` | Yes | |
| `TUYA_ACCESS_SECRET` | Yes | |
| `TUYA_UID` or `TUYA_HOME_ID` or `TUYA_SCHEMA` or `TUYA_DEVICE_IDS` | Yes (one) | Device discovery |
| `TUYA_DEVICE_CATEGORY` | Optional | e.g. `zwjcy` for soil sensors |
| `TRUST_PROXY` | Optional | Set `true` if you add a custom domain in front of Vercel |

5. Deploy.

After deploy, open your Vercel URL, sign in with `CONFIG_PASSWORD`, and open **Settings** to set moisture thresholds.

---

## 4. History polling (external cron — Hobby-friendly)

Vercel **Hobby** only allows **one cron per day**, so this project does **not** use Vercel Cron. Poll history with a free external scheduler instead.

The endpoint `GET https://YOUR_APP.vercel.app/api/cron/poll`:

- Requires header: `Authorization: Bearer YOUR_CRON_SECRET`
- Fetches a Tuya snapshot and writes readings to Neon

### Set up [cron-job.org](https://cron-job.org) (free)

1. Create an account → **Cronjobs** → **Create cronjob**.
2. **URL:** `https://your-app.vercel.app/api/cron/poll`
3. **Schedule:** every 5 minutes (or every 15 if you prefer).
4. **Request method:** GET (or POST — both work).
5. Under **Advanced** → **Headers**, add:
   - Name: `Authorization`
   - Value: `Bearer YOUR_CRON_SECRET` (same value as in Vercel env)
6. Save and enable the job.

Manual test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/poll
```

You should get JSON like `{"ok":true,"stored":30,...}`.

**Vercel Pro:** You can add a `crons` block to `vercel.json` instead (e.g. `*/5 * * * *` → `/api/cron/poll`). Hobby deploys must leave that out.

---

## 5. Local development

**Express (SQLite + file config, with poller):**

```bash
cp .env.example .env
# Leave DATABASE_URL unset for SQLite in ./data
npm install
npm start
```

**Against Neon (like production):**

```bash
DATABASE_URL=postgresql://...
CONFIG_PASSWORD=...
npm run db:schema
npm start
# Poller runs in-process; set HISTORY_POLL=false if you only want cron in cloud
```

**Vercel dev (serverless routes):**

```bash
npm i -g vercel   # or: npx vercel
vercel link
vercel env pull .env.local
npm run dev
```

---

## 6. Migrating from a Pi / Docker install

1. Export nothing from SQLite is automatic — history starts fresh in Neon unless you migrate SQL manually.
2. Copy alert thresholds from `data/config.json` into the deployed **Settings** page, or insert into `app_config` in Neon.
3. Point DNS at Vercel (optional custom domain in Vercel project settings).

---

## 7. Security checklist

- Strong `CONFIG_PASSWORD` and `CRON_SECRET` (long random strings).
- Do not commit `.env` or connection strings.
- Neon: use pooled URL and restrict IP if your plan supports it.
- Tuya: least-privilege cloud project linked to your Smart Life app.

---

## Optional: Docker on a home machine

You can still run locally with Docker (see [README.md](README.md)). Production in the cloud is **Vercel + Neon** as described above.
