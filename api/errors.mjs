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

/** Wrap async Express handlers so rejections become JSON error responses. */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => sendApiError(res, err));
  };
}

/** Send a Tuya SDK response as JSON, or 502 when success is false. */
export function sendTuyaResult(res, result) {
  if (!result.success) {
    const body = { error: result.msg ?? 'Tuya error' };
    if (exposeDebugDetails()) {
      body.code = result.code;
      body.raw = result;
    }
    return json(res, 502, body);
  }
  return json(res, 200, result.result);
}
