import { createTuyaContext } from '../tuya/context.mjs';
import { createStore } from '../history/store.mjs';
import { applyDeviceFilters, fetchAllDevices, toPublicDevice } from '../tuya/devices.mjs';
import { fetchSnapshot } from '../tuya/snapshot.mjs';
import { loadConfig, saveConfigFromBody } from '../config/store.mjs';
import { isValidDeviceId, safeRedirectPath, timingSafeEqualString } from '../lib/security.mjs';
import { HttpError, sendApiError } from './errors.mjs';
import { assertAuthConfigured, handleLogin, handleLogout } from '../auth.mjs';
import { applySecurityHeaders } from '../lib/headers.mjs';
import { isAuthenticatedFromCookieHeader } from '../lib/auth-cookie.mjs';

let depsPromise;

async function getDeps() {
  if (!depsPromise) {
    assertAuthConfigured();
    const ctx = createTuyaContext();
    const store = await createStore();
    depsPromise = { ctx, store };
  }
  return depsPromise;
}

function apiPathname(req) {
  const raw = req.url ?? '/';
  const path = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0];
  return path.replace(/^\/api/, '') || '/';
}

function isPublicApi(pathname, method) {
  if (pathname === '/health') return true;
  if (pathname === '/login' && method === 'POST') return true;
  return false;
}

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

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function queryFromReq(req) {
  const raw = req.url ?? '/';
  const search = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
  return Object.fromEntries(new URLSearchParams(search));
}

export async function handleApi(req, res) {
  applySecurityHeaders(res);
  const method = req.method ?? 'GET';
  const pathname = apiPathname(req);

  if (!isPublicApi(pathname, method)) {
    if (!isAuthenticatedFromCookieHeader(req.headers.cookie)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { ctx, store } = await getDeps();

    if (pathname === '/login' && method === 'POST') {
      req.body = await readJsonBody(req);
      return handleLogin(req, res);
    }
    if (pathname === '/logout' && method === 'POST') {
      return handleLogout(req, res);
    }
    if (pathname === '/health' && method === 'GET') {
      return res.status(200).json({ ok: true, history: store.kind });
    }
    if (pathname === '/devices' && method === 'GET') {
      let list = await fetchAllDevices(ctx);
      list = applyDeviceFilters(list);
      return res.status(200).json({
        total: list.length,
        devices: list.map(toPublicDevice),
      });
    }
    if (pathname === '/snapshot' && method === 'GET') {
      return res.status(200).json(await fetchSnapshot(ctx));
    }
    if (pathname === '/config' && method === 'GET') {
      return res.status(200).json({ config: await loadConfig() });
    }
    if (pathname === '/config' && (method === 'PUT' || method === 'PATCH')) {
      const body = await readJsonBody(req);
      const config = await saveConfigFromBody(body ?? {});
      return res.status(200).json({ config });
    }
    if (pathname === '/history' && method === 'GET') {
      const query = parseHistoryQuery(queryFromReq(req));
      const readings = await store.queryReadings(query);
      return res.status(200).json({
        device_id: query.device_id,
        code: query.code ?? null,
        readings,
        count: readings.length,
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    sendApiError(res, err);
  }
}
