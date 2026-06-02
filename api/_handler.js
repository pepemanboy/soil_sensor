import { handleApi } from './dispatch.mjs';
import { json } from '../lib/http-response.mjs';

/** Shared Vercel serverless entry with top-level error handling. */
export default async function vercelHandler(req, res) {
  try {
    await handleApi(req, res);
  } catch (err) {
    console.error('Unhandled API error:', err);
    if (!res.writableEnded) {
      json(res, 500, { error: err?.message ?? 'Internal server error' });
    }
  }
}
