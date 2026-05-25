# alerts/

Daily email when plants need attention, based on live snapshot + `config.json`.

## Flow

1. **`scheduler.mjs`** — runs once per day at `ALERT_HOUR_LOCAL` (default 8:00); tracks last send in `data/alert-state.json`
2. **`evaluate.mjs`** — compares snapshot to thresholds → low moisture, low battery, offline
3. **`email.mjs`** — builds message and sends via SMTP (nodemailer)

Started automatically from `server.mjs` when SMTP + `ALERT_EMAIL_TO` are configured.

## Manual test

```bash
npm run alert:once
```

Runs `../send-alert.mjs` with `force: true` (ignores “already sent today”).

## Env

`ALERT_EMAIL_TO`, `ALERT_EMAIL_CC`, `SMTP_*`, `ALERT_HOUR_LOCAL`, `ALERT_EMAIL_ENABLED=false` to disable.

The web UI and APIs require `CONFIG_PASSWORD` login (see [`auth.mjs`](../auth.mjs)).
