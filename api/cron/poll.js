import { runPollOnce } from '../../history/poll-once.mjs';
import { json } from '../../lib/http-response.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return json(res, 500, { error: 'CRON_SECRET is not configured' });
  }

  const auth = req.headers.authorization ?? '';
  if (auth !== `Bearer ${secret}`) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  try {
    const result = await runPollOnce();
    return json(res, 200, { ok: true, ...result });
  } catch (err) {
    console.error('Cron poll failed:', err);
    return json(res, 500, { error: err.message ?? 'Poll failed' });
  }
}
