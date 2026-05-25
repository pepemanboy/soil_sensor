import fs from 'fs';
import path from 'path';
import { dataPath } from '../lib/paths.mjs';
import { HttpError } from '../lib/http-error.mjs';

export const DEFAULT_CONFIG = {
  lowBatteryPercent: 20,
  defaultMoisturePercent: 25,
  moistureThresholds: {},
};

function configPath() {
  return process.env.CONFIG_PATH?.trim() || dataPath('config.json');
}

function clampPercent(n, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, v));
}

function normalizeConfig(raw) {
  const c = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
  c.lowBatteryPercent = clampPercent(c.lowBatteryPercent, DEFAULT_CONFIG.lowBatteryPercent);

  c.defaultMoisturePercent = clampPercent(
    c.defaultMoisturePercent,
    DEFAULT_CONFIG.defaultMoisturePercent
  );

  const thresholds = {};
  if (c.moistureThresholds && typeof c.moistureThresholds === 'object') {
    for (const [id, val] of Object.entries(c.moistureThresholds)) {
      if (val == null || val === '') continue;
      thresholds[String(id)] = clampPercent(val, null);
    }
  }
  c.moistureThresholds = thresholds;
  return c;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function getConfigPath() {
  return configPath();
}

export function loadConfig() {
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

export function saveConfig(partial) {
  const file = configPath();
  const current = loadConfig();
  const next = normalizeConfig({ ...current, ...partial });
  if (partial?.moistureThresholds) {
    next.moistureThresholds = normalizeConfig({
      ...current,
      moistureThresholds: partial.moistureThresholds,
    }).moistureThresholds;
  }
  ensureDir(file);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
  return next;
}

export function moistureThresholdForDevice(config, deviceId) {
  const per = config.moistureThresholds?.[deviceId];
  if (per != null) return per;
  return config.defaultMoisturePercent;
}

/** Build and persist a config patch from an API request body. */
export function saveConfigFromBody(body) {
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
