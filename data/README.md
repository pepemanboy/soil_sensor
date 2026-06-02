# data/

Local-only runtime files when **`DATABASE_URL` is not set** (SQLite + file config). Not used on Vercel.

| File | Purpose |
|------|---------|
| `history.db` | SQLite readings |
| `config.json` | Alert thresholds |

With `DATABASE_URL` (Neon), history and config live in Postgres instead.

Override paths: `HISTORY_DB_PATH`, `CONFIG_PATH` in `.env`.
