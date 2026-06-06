import { getPool } from '../lib/db.mjs';

/** @returns {Promise<{ kind: 'postgres', insertReadings(rows), queryReadings(opts) }>} */
export async function createStore() {
  const pool = await getPool();
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
      return r.rows.map((row) => ({
        ...row,
        recorded_at: Number(row.recorded_at),
      }));
    },
  };
}
