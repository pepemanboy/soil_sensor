# config/

Loads and saves alert thresholds to a JSON file (default: `data/config.json`).

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

- **`store.mjs`** — `loadConfig()`, `saveConfig()`, `moistureThresholdForDevice()`, `getConfigPath()`

Override file location with `CONFIG_PATH` in `.env`.
