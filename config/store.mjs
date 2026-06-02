import fs from 'fs';
import path from 'path';
import { dataPath } from '../lib/paths.mjs';
import { HttpError } from '../lib/http-error.mjs';
import { databaseUrl, getPool } from '../lib/db.mjs';
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  moistureThresholdForDevice,
} from './normalize.mjs';

export { DEFAULT_CONFIG, moistureThresholdForDevice };

function configPath() {
  return process.env.CONFIG_PATH?.trim() || dataPath('config.json');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function getConfigPath() {
  return databaseUrl() ? 'postgres:app_config' : configPath();
}

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

function loadConfigFromFile() {
  const file = configPath();
  try {
    if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG, moistureThresholds: {} };
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return normalizeConfig(raw);
  } catch (e) {
    console.error('Config read failed, using defaults:', e.message);
    return normalizeConfig({});
  }
}

export async function loadConfig() {
  if (databaseUrl()) return loadConfigFromDb();
  return loadConfigFromFile();
}

async function saveConfigToDb(partial) {
  const current = await loadConfigFromDb();
  const next = mergeConfigPatch(current, partial);
  const pool = await getPool();
  await pool.query(
    `UPDATE app_config SET payload = $1::jsonb, updated_at = $2 WHERE id = 'default'`,
    [JSON.stringify(next), Date.now()]
  );
  return next;
}

function saveConfigToFile(partial) {
  const current = loadConfigFromFile();
  const next = mergeConfigPatch(current, partial);
  const file = configPath();
  ensureDir(file);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
  return next;
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

export async function saveConfig(partial) {
  if (databaseUrl()) return saveConfigToDb(partial);
  return saveConfigToFile(partial);
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
