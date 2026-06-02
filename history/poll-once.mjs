import { createTuyaContext } from '../tuya/context.mjs';
import { createStore } from './store.mjs';
import { fetchSnapshot, snapshotToReadings } from '../tuya/snapshot.mjs';

export async function runPollOnce() {
  const ctx = createTuyaContext();
  const store = await createStore();
  const snap = await fetchSnapshot(ctx);
  const rows = snapshotToReadings(snap.statusById, snap.t);
  const stored = await store.insertReadings(rows);
  return {
    stored,
    recordedAt: snap.t,
    devices: snap.devices.length,
  };
}
