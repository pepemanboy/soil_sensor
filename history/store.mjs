import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { dataPath } from '../lib/paths.mjs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  code TEXT NOT NULL,
  value TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_readings_lookup
  ON readings (device_id, code, recorded_at DESC);
`;

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  code TEXT NOT NULL,
  value TEXT NOT NULL,
  recorded_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_readings_lookup
  ON readings (device_id, code, recorded_at DESC);
`;

/** @returns {Promise<{ kind: 'sqlite'|'postgres', path?: string, insertReadings(rows), queryReadings(opts), close?() }>} */
export async function createStore() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return createPostgresStore(databaseUrl);
  return createSqliteStore();
}

async function createSqliteStore() {
  const dbPath = process.env.HISTORY_DB_PATH?.trim() || dataPath('history.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);

  return {
    kind: 'sqlite',
    path: dbPath,
    async insertReadings(rows) {
      if (!rows.length) return 0;
      const stmt = db.prepare(
        'INSERT INTO readings (device_id, code, value, recorded_at) VALUES (?, ?, ?, ?)'
      );
      for (const r of rows) stmt.run(r.device_id, r.code, r.value, r.recorded_at);
      return rows.length;
    },
    async queryReadings({ device_id, code, since_ms, until_ms, limit = 2000 }) {
      const clauses = ['device_id = ?'];
      const params = [device_id];
      if (code) {
        clauses.push('code = ?');
        params.push(code);
      }
      if (since_ms != null) {
        clauses.push('recorded_at >= ?');
        params.push(since_ms);
      }
      if (until_ms != null) {
        clauses.push('recorded_at <= ?');
        params.push(until_ms);
      }
      params.push(limit);
      const sql = `
        SELECT device_id, code, value, recorded_at
        FROM readings
        WHERE ${clauses.join(' AND ')}
        ORDER BY recorded_at ASC
        LIMIT ?
      `;
      return stmtAll(db, sql, params);
    },
    close() {
      db.close();
    },
  };
}

function stmtAll(db, sql, params) {
  return db.prepare(sql).all(...params);
}

async function createPostgresStore(databaseUrl) {
  const pg = await import('pg');
  const pool = new pg.default.Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
  await pool.query(PG_SCHEMA);

  return {
    kind: 'postgres',
    async insertReadings(rows) {
      if (!rows.length) return 0;
      const values = [];
      const placeholders = rows.map((r, i) => {
        const base = i * 4;
        values.push(r.device_id, r.code, r.value, r.recorded_at);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });
      await pool.query(
        `INSERT INTO readings (device_id, code, value, recorded_at) VALUES ${placeholders.join(', ')}`,
        values
      );
      return rows.length;
    },
    async queryReadings({ device_id, code, since_ms, until_ms, limit = 2000 }) {
      const clauses = ['device_id = $1'];
      const params = [device_id];
      if (code) {
        params.push(code);
        clauses.push(`code = $${params.length}`);
      }
      if (since_ms != null) {
        params.push(since_ms);
        clauses.push(`recorded_at >= $${params.length}`);
      }
      if (until_ms != null) {
        params.push(until_ms);
        clauses.push(`recorded_at <= $${params.length}`);
      }
      params.push(limit);
      const sql = `
        SELECT device_id, code, value, recorded_at
        FROM readings
        WHERE ${clauses.join(' AND ')}
        ORDER BY recorded_at ASC
        LIMIT $${params.length}
      `;
      const r = await pool.query(sql, params);
      return r.rows;
    },
    close: async () => {
      await pool.end();
    },
  };
}
