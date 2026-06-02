# Deployment (Vercel + Neon)

Hosted dashboard: **Vercel** (static UI + serverless API) and **Neon** (Postgres for history and settings).

---

## Architecture

| Piece | Where | Role |
|-------|--------|------|
| Static UI | Vercel `public/` | Dashboard, login, settings |
| API | Vercel `api/` | Tuya snapshot, config, history |
| History polling | [cron-job.org](https://cron-job.org) (or similar) | Calls `/api/cron/poll` on a schedule |
| Database | Neon Postgres | `readings` + `app_config` |

---

## 1. Neon database

1. Create a project at [Neon](https://neon.tech).
2. Copy the **pooled** connection string (`…-pooler.…`).
3. Ensure `?sslmode=require` is in the URL.

From your machine (with `DATABASE_URL` in `.env`):

```bash
npm install
npm run db:schema
```

---

## 2. Tuya credentials

See [`.env.example`](.env.example): `TUYA_BASE_URL`, `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`, and one discovery option (`TUYA_UID`, etc.).

---

## 3. Deploy to Vercel

1. Import [the GitHub repo](https://github.com/pepemanboy/soil_sensor) at [vercel.com/new](https://vercel.com/new).
2. **Framework preset:** **Other** — leave build/output empty.
3. **Environment variables:**

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes (Neon pooled URL) |
| `CONFIG_PASSWORD` | Yes |
| `CRON_SECRET` | Yes (random string) |
| Tuya vars | Yes |

4. Deploy. Use **https://your-project.vercel.app** (production), not a preview URL, unless you disable preview protection.

**“Authentication Required” page:** Vercel **Deployment Protection** — **Settings → Deployment Protection** → allow public access on Production (and Preview if needed). Then use this app’s login (`CONFIG_PASSWORD`).

---

## 4. History polling (cron-job.org)

Vercel Hobby cannot run cron every 5 minutes. Use a free external scheduler:

1. [cron-job.org](https://cron-job.org) → **Create cronjob**
2. **URL:** `https://your-app.vercel.app/api/cron/poll`
3. **Schedule:** every 5–15 minutes
4. **Header:** `Authorization` = `Bearer YOUR_CRON_SECRET`

Test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/poll
```

---

## 5. Local development

Same `.env` as production (including `DATABASE_URL`):

```bash
npm install
npm run db:schema   # once
npm start
```

Open http://localhost:3000.

To mimic serverless routes: `vercel link`, `vercel env pull .env.local`, `npm run dev`.

---

## 6. Security

- Strong `CONFIG_PASSWORD` and `CRON_SECRET`
- Never commit `.env`
- Neon: pooled connection string; restrict access if your plan allows
