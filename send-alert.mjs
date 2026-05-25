import 'dotenv/config';
import { createTuyaContext } from './tuya/context.mjs';
import { runDailyAlert } from './alerts/scheduler.mjs';

const ctx = createTuyaContext();
const out = await runDailyAlert({ ctx, force: true });
console.log(JSON.stringify(out, null, 2));
