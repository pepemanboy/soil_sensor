import { timingSafeEqualString } from './lib/security.mjs';
import {
  assertAuthConfigured,
  setAuthCookieHeader,
  clearAuthCookieHeader,
} from './lib/auth-cookie.mjs';
import { json } from './lib/http-response.mjs';

export { assertAuthConfigured };

export function handleLogin(req, res) {
  const password = String(req.body?.password ?? '');
  const expected = process.env.CONFIG_PASSWORD?.trim();
  if (!expected || !timingSafeEqualString(password, expected)) {
    return json(res, 401, { error: 'Invalid password' });
  }

  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  setAuthCookieHeader(res, { secure });
  return json(res, 200, { ok: true });
}

export function handleLogout(_req, res) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  clearAuthCookieHeader(res, { secure });
  return json(res, 200, { ok: true });
}
