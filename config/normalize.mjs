export const DEFAULT_CONFIG = {
  lowBatteryPercent: 20,
  defaultMoisturePercent: 25,
  moistureThresholds: {},
};

export function clampPercent(n, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, v));
}

export function normalizeConfig(raw) {
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

export function moistureThresholdForDevice(config, deviceId) {
  const per = config.moistureThresholds?.[deviceId];
  if (per != null) return per;
  return config.defaultMoisturePercent;
}
