import { fetchSnapshot, snapshotToReadings } from '../tuya/snapshot.mjs';

function pollIntervalMs() {
  const n = Number(process.env.POLL_INTERVAL_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : 300_000;
}

export function startHistoryPoller({ ctx, store, onError }) {
  let running = false;
  let timer;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const snap = await fetchSnapshot(ctx);
      const rows = snapshotToReadings(snap.statusById, snap.t);
      const n = await store.insertReadings(rows);
      if (n) console.log(`History: stored ${n} readings at ${new Date(snap.t).toISOString()}`);
    } catch (e) {
      console.error('History poll failed:', e.message);
      onError?.(e);
    } finally {
      running = false;
    }
  };

  const interval = pollIntervalMs();
  if (process.env.POLL_ON_START !== 'false') tick();
  timer = setInterval(tick, interval);
  console.log(`History poller: every ${Math.round(interval / 1000)}s (${store.kind}${store.path ? ` → ${store.path}` : ''})`);

  return () => clearInterval(timer);
}
