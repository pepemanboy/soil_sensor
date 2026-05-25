import crypto from 'crypto';

const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/;

/** Reject open redirects and protocol-relative URLs. */
export function safeRedirectPath(url, fallback = '/') {
  if (typeof url !== 'string' || !url) return fallback;
  if (!url.startsWith('/') || url.startsWith('//')) return fallback;
  if (/[\r\n\\]/.test(url)) return fallback;
  return url;
}

export function isValidDeviceId(id) {
  return typeof id === 'string' && DEVICE_ID_RE.test(id);
}

export function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function clientIp(req) {
  if (req.app?.get('trust proxy')) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://cdn.jsdelivr.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
}
