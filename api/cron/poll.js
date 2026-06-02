import { runPollOnce } from '../../history/poll-once.mjs';

function unauthorized(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  }

  const auth = req.headers.authorization ?? '';
  if (auth !== `Bearer ${secret}`) {
    return unauthorized(res);
  }

  try {
    const result = await runPollOnce();
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron poll failed:', err);
    return res.status(500).json({ error: err.message ?? 'Poll failed' });
  }
}
