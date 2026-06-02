import { Router } from 'express';
import { applyDeviceFilters, fetchAllDevices, toPublicDevice } from '../tuya/devices.mjs';
import { fetchSnapshot } from '../tuya/snapshot.mjs';
import { loadConfig, saveConfigFromBody } from '../config/store.mjs';
import { handleLogin, handleLogout } from '../auth.mjs';
import { isValidDeviceId } from '../lib/security.mjs';
import { HttpError, asyncHandler, sendApiError } from './errors.mjs';

function parseHistoryQuery(query) {
  const device_id = query.device_id?.trim();
  if (!device_id) throw new HttpError(400, 'device_id query param required');
  if (!isValidDeviceId(device_id)) throw new HttpError(400, 'Invalid device_id');

  const code = query.code?.trim() || undefined;
  const hours = Number(query.hours);
  const limit = Math.min(Number(query.limit) || 2000, 10_000);
  const since_ms = Number.isFinite(hours) && hours > 0
    ? Date.now() - hours * 60 * 60 * 1000
    : Number(query.since_ms) || undefined;
  const until_ms = query.until_ms ? Number(query.until_ms) : undefined;

  return { device_id, code, since_ms, until_ms, limit };
}

export function createApiRouter({ ctx, store }) {
  const router = Router();

  router.post('/login', (req, res) => {
    try {
      handleLogin(req, res);
    } catch (e) {
      sendApiError(res, e);
    }
  });

  router.post('/logout', (req, res) => {
    try {
      handleLogout(req, res);
    } catch (e) {
      sendApiError(res, e);
    }
  });

  router.get('/health', (_req, res) => {
    res.json({ ok: true, history: store.kind });
  });

  router.get('/devices', asyncHandler(async (_req, res) => {
    let list = await fetchAllDevices(ctx);
    list = applyDeviceFilters(list);
    res.json({
      total: list.length,
      devices: list.map(toPublicDevice),
    });
  }));

  router.get('/snapshot', asyncHandler(async (_req, res) => {
    res.json(await fetchSnapshot(ctx));
  }));

  router.get('/config', asyncHandler(async (_req, res) => {
    res.json({ config: await loadConfig() });
  }));

  router.put('/config', asyncHandler(async (req, res) => {
    const config = await saveConfigFromBody(req.body ?? {});
    res.json({ config });
  }));

  router.get('/history', asyncHandler(async (req, res) => {
    const query = parseHistoryQuery(req.query);
    const readings = await store.queryReadings(query);
    res.json({
      device_id: query.device_id,
      code: query.code ?? null,
      readings,
      count: readings.length,
    });
  }));

  return router;
}
