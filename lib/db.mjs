import { DEFAULT_CONFIG, normalizeConfig } from '../config/normalize.mjs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  code TEXT NOT NULL,
  value TEXT NOT NULL,
  recorded_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_readings_lookup
  ON readings (device_id, code, recorded_at DESC);

CREATE TABLE IF NOT EXISTS app_config (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);
`;

let poolPromise;

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || '';
}

export function requireDatabaseUrl() {
  const url = databaseUrl();
  if (!url) {
    throw new Error('DATABASE_URL is required (use your Neon connection string)');
  }
  return url;
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pg = await import('pg');
      const pool = new pg.default.Pool({
        connectionString: requireDatabaseUrl(),
        ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 5,
      });
      await pool.query(SCHEMA);
      return pool;
    })();
  }
  return poolPromise;
}

export async function ensureDefaultConfig() {
  const pool = await getPool();
  const r = await pool.query(`SELECT payload FROM app_config WHERE id = 'default'`);
  if (r.rows.length) return normalizeConfig(r.rows[0].payload);
  const payload = { ...DEFAULT_CONFIG, moistureThresholds: {} };
  await pool.query(
    `INSERT INTO app_config (id, payload, updated_at) VALUES ('default', $1::jsonb, $2)`,
    [JSON.stringify(payload), Date.now()]
  );
  return payload;
}
