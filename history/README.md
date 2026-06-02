# history/

Persists sensor readings over time and polls Tuya on an interval.

## Storage

- **Default:** SQLite file `data/history.db` (Node built-in `node:sqlite`)
- **Optional:** Postgres when `DATABASE_URL` is set

Table `readings`: `device_id`, `code`, `value`, `recorded_at` (ms). Names are not stored.

Default datapoints: `humidity`, `temp_current`, `battery_percentage` (override with `HISTORY_CODES`).

## Modules

| File | Role |
|------|------|
| `store.mjs` | `createStore()`, `insertReadings()`, `queryReadings()` |
| `poller.mjs` | `startHistoryPoller()` — used by `app.mjs` when `HISTORY_POLL` is not `false` |

## Related

- `../tuya/snapshot.mjs` — `snapshotToReadings()` builds rows for insert

Env: `HISTORY_DB_PATH`, `POLL_INTERVAL_MS` (default 5 min), `POLL_ON_START`, `HISTORY_POLL=false` to disable in server.
