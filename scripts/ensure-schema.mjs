import 'dotenv/config';
import { getPool, ensureDefaultConfig } from '../lib/db.mjs';

await getPool();
const config = await ensureDefaultConfig();
console.log('Database schema ready.');
console.log('Default config:', JSON.stringify(config, null, 2));
