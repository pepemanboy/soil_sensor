import crypto from 'crypto';

export const COOKIE_NAME = 'soil_auth';

export function assertAuthConfigured() {
  if (!process.env.CONFIG_PASSWORD?.trim()) {
    throw new Error('CONFIG_PASSWORD is required (see .env.example)');
  }
}

export function authToken() {
  const secret = process.env.CONFIG_PASSWORD.trim();
  return crypto.createHmac('sha256', secret).update('config-ok').digest('hex');
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function cookieMatches(token) {
  const expected = Buffer.from(authToken(), 'utf8');
  const provided = Buffer.from(String(token ?? ''), 'utf8');
  if (expected.length !== provided.length) {
    crypto.timingSafeEqual(expected, expected);
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
}

export function isAuthenticatedFromCookieHeader(cookieHeader) {
  return cookieMatches(parseCookies(cookieHeader)[COOKIE_NAME]);
}

export function setAuthCookieHeader(res, { secure = process.env.NODE_ENV === 'production' } = {}) {
  const maxAge = 30 * 24 * 60 * 60;
  const flags = [
    `${COOKIE_NAME}=${authToken()}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : '',
  ].filter(Boolean);
  res.setHeader('Set-Cookie', flags.join('; '));
}

export function clearAuthCookieHeader(res, { secure = process.env.NODE_ENV === 'production' } = {}) {
  const flags = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ].filter(Boolean);
  res.setHeader('Set-Cookie', flags.join('; '));
}
