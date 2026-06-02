# config/

Alert thresholds (low battery %, default moisture %, per-device overrides).

## Storage

| Environment | Where |
|-------------|--------|
| Local `npm start` (no `DATABASE_URL`) | `data/config.json` |
| Vercel + Neon | Postgres table `app_config` |

## Schema

```json
{
  "lowBatteryPercent": 20,
  "defaultMoisturePercent": 25,
  "moistureThresholds": {
    "device_id_here": 30
  }
}
```

- **`lowBatteryPercent`** — global; alert when battery is at or below this value.
- **`defaultMoisturePercent`** — required; used when a plant has no per-device override.
- **`moistureThresholds`** — optional map of Tuya **device ID** → alert below % (overrides default).

Renaming plants in Smart Life does not change device IDs, so history and thresholds stay linked.

## Module

- **`normalize.mjs`** — validation and `moistureThresholdForDevice()`
- **`store.mjs`** — `loadConfig()`, `saveConfig()`, `saveConfigFromBody()` (async when using Postgres)

Override file location with `CONFIG_PATH` in `.env` (local file mode only).
