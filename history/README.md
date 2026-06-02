# history/

Sensor readings in Neon (`readings` table).

| File | Role |
|------|------|
| `store.mjs` | `createStore()`, `insertReadings()`, `queryReadings()` |
| `poll-once.mjs` | Single poll — `/api/cron/poll` |

Default datapoints: `humidity`, `temp_current`, `battery_percentage` (override with `HISTORY_CODES`).

History is filled by **cron-job.org** calling `/api/cron/poll`, not by a background process in the app.
