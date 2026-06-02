# Deployment (Vercel + Neon)

## Architecture

| Piece | Where | Role |
|-------|--------|------|
| Static UI | Vercel `public/` | Dashboard, login, settings |
| API | `api/index.js` | Tuya snapshot, config, history |
| History polling | [cron-job.org](https://cron-job.org) | `GET /api/cron/poll` on a schedule |
| Database | Neon Postgres | `readings` + `app_config` |

---

## 1. Neon

1. Create a project at [Neon](https://neon.tech).
2. Copy the **pooled** connection string (`…-pooler.…`) with `?sslmode=require`.

```bash
npm install
npm run db:schema   # needs DATABASE_URL in .env
```

---

## 2. Vercel

1. Import [github.com/pepemanboy/soil_sensor](https://github.com/pepemanboy/soil_sensor).
2. **Framework preset:** **Other** — no build command.
3. **Environment variables:** `DATABASE_URL`, `CONFIG_PASSWORD`, `CRON_SECRET`, and all Tuya vars (see `.env.example`).
4. Deploy. Use the **production** URL (not a preview URL unless preview protection is disabled).

**“Authentication Required” (Vercel SSO):** **Settings → Deployment Protection** → allow public access. App login uses `CONFIG_PASSWORD`.

---

## 3. History polling (cron-job.org)

Vercel Hobby cannot run frequent built-in crons. Use [cron-job.org](https://cron-job.org):

- **URL:** `https://your-app.vercel.app/api/cron/poll`
- **Schedule:** every 5–15 minutes
- **Header:** `Authorization` = `Bearer YOUR_CRON_SECRET`

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/poll
```

---

## 4. Local development

```bash
cp .env.example .env   # fill in all values
npm install
npm run db:schema
npm run dev
```

Uses `vercel dev` with the same serverless functions as production. Pull env from Vercel optionally:

```bash
npx vercel link
npx vercel env pull .env.local
```

---

## 5. Security

- Strong `CONFIG_PASSWORD` and `CRON_SECRET`
- Never commit `.env`
- Neon: pooled connection string
