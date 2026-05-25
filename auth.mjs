import crypto from 'crypto';
import { clientIp, safeRedirectPath, timingSafeEqualString } from './lib/security.mjs';

const COOKIE_NAME = 'soil_auth';
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = new Map();

export function assertAuthConfigured() {
  if (!process.env.CONFIG_PASSWORD?.trim()) {
    throw new Error('CONFIG_PASSWORD is required in .env (see .env.example)');
  }
}

function authToken() {
  const secret = process.env.CONFIG_PASSWORD.trim();
  return crypto.createHmac('sha256', secret).update('config-ok').digest('hex');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function cookieMatches(token) {
  const expected = Buffer.from(authToken(), 'utf8');
  const provided = Buffer.from(String(token ?? ''), 'utf8');
  if (expected.length !== provided.length) {
    crypto.timingSafeEqual(expected, expected);
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
}

export function isAuthenticated(req) {
  return cookieMatches(parseCookies(req.headers.cookie)[COOKIE_NAME]);
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
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const nextUrl = safeRedirectPath(req.originalUrl || '/', '/');
  return res.redirect(`/login.html?next=${encodeURIComponent(nextUrl)}`);
}

export function handleLogin(req, res) {
  if (loginRateLimited(req)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const password = String(req.body?.password ?? '');
  const expected = process.env.CONFIG_PASSWORD.trim();
  if (!timingSafeEqualString(password, expected)) {
    const locked = recordLoginFailure(clientIp(req));
    if (locked) {
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    return res.status(401).json({ error: 'Invalid password' });
  }

  clearLoginFailures(clientIp(req));
  const maxAge = 30 * 24 * 60 * 60 * 1000;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${authToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge / 1000)}${secure}`
  );
  return res.json({ ok: true });
}

export function handleLogout(_req, res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
  return res.json({ ok: true });
}
