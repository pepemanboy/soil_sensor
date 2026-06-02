import { clientIp, safeRedirectPath, timingSafeEqualString } from './lib/security.mjs';
import {
  assertAuthConfigured,
  isAuthenticatedFromCookieHeader,
  setAuthCookieHeader,
  clearAuthCookieHeader,
} from './lib/auth-cookie.mjs';
import { json } from './lib/http-response.mjs';

export { assertAuthConfigured };

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

export function isAuthenticated(req) {
  return isAuthenticatedFromCookieHeader(req.headers.cookie);
}

function isPublicPath(req) {
  const p = req.path;
  if (p === '/login.html' || p === '/login.js') return true;
  if (p === '/api/health') return true;
  if (p === '/api/login' && req.method === 'POST') return true;
  return false;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, entry);
  }
  entry.count += 1;
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function clearLoginFailures(ip) {
  loginAttempts.delete(ip);
}

function loginRateLimited(req) {
  if (process.env.VERCEL) return false;
  const ip = clientIp(req);
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

export function requireAuth(req, res, next) {
  if (isPublicPath(req)) return next();
  if (isAuthenticated(req)) return next();

  if (req.path.startsWith('/api/')) {
    return json(res, 401, { error: 'Unauthorized' });
  }
  const nextUrl = safeRedirectPath(req.originalUrl || '/', '/');
  return res.redirect(`/login.html?next=${encodeURIComponent(nextUrl)}`);
}

export function handleLogin(req, res) {
  if (loginRateLimited(req)) {
    return json(res, 429, { error: 'Too many login attempts. Try again later.' });
  }

  const password = String(req.body?.password ?? '');
  const expected = process.env.CONFIG_PASSWORD?.trim();
  if (!expected || !timingSafeEqualString(password, expected)) {
    if (!process.env.VERCEL) {
      const locked = recordLoginFailure(clientIp(req));
      if (locked) {
        return json(res, 429, { error: 'Too many login attempts. Try again later.' });
      }
    }
    return json(res, 401, { error: 'Invalid password' });
  }

  if (!process.env.VERCEL) clearLoginFailures(clientIp(req));
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  setAuthCookieHeader(res, { secure });
  return json(res, 200, { ok: true });
}

export function handleLogout(_req, res) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  clearAuthCookieHeader(res, { secure });
  return json(res, 200, { ok: true });
}
