import 'dotenv/config';
import { createTuyaContext } from './tuya/context.mjs';
import { createStore } from './history/store.mjs';
import { startHistoryPoller } from './history/poller.mjs';
import { fetchSnapshot, snapshotToReadings } from './tuya/snapshot.mjs';

const ctx = createTuyaContext();
const store = await createStore();

if (process.argv.includes('--once')) {
  const snap = await fetchSnapshot(ctx);
  const rows = snapshotToReadings(snap.statusById, snap.t);
  const n = await store.insertReadings(rows);
  console.log(JSON.stringify({ stored: n, at: snap.t, devices: snap.devices.length }, null, 2));
  await store.close?.();
  process.exit(0);
}

startHistoryPoller({ ctx, store });
