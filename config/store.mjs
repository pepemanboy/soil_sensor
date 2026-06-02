import { HttpError } from '../lib/http-error.mjs';
import { getPool } from '../lib/db.mjs';
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  moistureThresholdForDevice,
} from './normalize.mjs';

export { DEFAULT_CONFIG, moistureThresholdForDevice };

async function loadConfigFromDb() {
  const pool = await getPool();
  const r = await pool.query(`SELECT payload FROM app_config WHERE id = 'default'`);
  if (!r.rows.length) {
    const payload = { ...DEFAULT_CONFIG, moistureThresholds: {} };
    await pool.query(
      `INSERT INTO app_config (id, payload, updated_at) VALUES ('default', $1::jsonb, $2)`,
      [JSON.stringify(payload), Date.now()]
    );
    return payload;
  }
  return normalizeConfig(r.rows[0].payload);
}

function mergeConfigPatch(current, partial) {
  const next = normalizeConfig({ ...current, ...partial });
  if (partial?.moistureThresholds) {
    next.moistureThresholds = normalizeConfig({
      ...current,
      moistureThresholds: partial.moistureThresholds,
    }).moistureThresholds;
  }
  return next;
}

export async function loadConfig() {
  return loadConfigFromDb();
}

export async function saveConfig(partial) {
  const current = await loadConfigFromDb();
  const next = mergeConfigPatch(current, partial);
  const pool = await getPool();
  await pool.query(
    `UPDATE app_config SET payload = $1::jsonb, updated_at = $2 WHERE id = 'default'`,
    [JSON.stringify(next), Date.now()]
  );
  return next;
}

/** Build and persist a config patch from an API request body. */
export async function saveConfigFromBody(body) {
  const patch = {};
  if (body.lowBatteryPercent != null) patch.lowBatteryPercent = body.lowBatteryPercent;
  if ('defaultMoisturePercent' in body) {
    if (body.defaultMoisturePercent == null || body.defaultMoisturePercent === '') {
      throw new HttpError(400, 'defaultMoisturePercent is required');
    }
    patch.defaultMoisturePercent = body.defaultMoisturePercent;
  }
  if (body.moistureThresholds && typeof body.moistureThresholds === 'object') {
    patch.moistureThresholds = body.moistureThresholds;
  }
  return saveConfig(patch);
}
