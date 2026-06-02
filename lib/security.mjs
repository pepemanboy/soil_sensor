import crypto from 'crypto';

const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/;

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
