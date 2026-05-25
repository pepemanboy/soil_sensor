# data/

Runtime files created by the app (not committed to git except this README).

| File | Created by |
|------|------------|
| `history.db` | History poller — SQLite readings |
| `config.json` | Config UI / `PUT /api/config` — alert thresholds |
| `alert-state.json` | Daily email scheduler — last send date |

All paths can be overridden via `.env` (`HISTORY_DB_PATH`, `CONFIG_PATH`, `ALERT_STATE_PATH`).

**Backup tip:** copy `config.json` and `history.db` if you migrate machines. Device IDs must match the same Tuya account.
