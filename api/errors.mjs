import { HttpError } from '../lib/http-error.mjs';
import { json } from '../lib/http-response.mjs';

export { HttpError };

/** Tuya permission / subscription errors → HTTP 403. */
export function tuyaHttpStatus(err) {
  if (err?.code === 1106 || err?.code === 2884) return 403;
  return 500;
}

function exposeDebugDetails() {
  return process.env.NODE_ENV !== 'production';
}

export function sendApiError(res, err, { defaultStatus = 500 } = {}) {
  const status = err instanceof HttpError ? err.status : tuyaHttpStatus(err) || defaultStatus;
  const body = { error: err.message };
  if (exposeDebugDetails()) {
    if (err?.code != null) body.code = err.code;
    if (err?.raw != null) body.raw = err.raw;
  }
  return json(res, status, body);
}
