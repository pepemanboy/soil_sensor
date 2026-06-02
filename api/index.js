import { handleApi } from './dispatch.mjs';
import { json } from '../lib/http-response.mjs';

export default async function handler(req, res) {
  try {
    await handleApi(req, res);
  } catch (err) {
    console.error('Unhandled API error:', err);
    if (!res.writableEnded) {
      json(res, 500, { error: err?.message ?? 'Internal server error' });
    }
  }
}
