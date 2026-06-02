# config/

Alert thresholds stored in Neon (`app_config` table).

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

- **`store.mjs`** — `loadConfig()`, `saveConfig()`, `saveConfigFromBody()`
- **`normalize.mjs`** — validation and `moistureThresholdForDevice()`
