import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTuyaContext } from '../tuya/context.mjs';
import { createStore } from '../history/store.mjs';
import { startHistoryPoller } from '../history/poller.mjs';
import { createApiRouter } from '../api/routes.mjs';
import { assertAuthConfigured, requireAuth } from '../auth.mjs';
import { securityHeaders } from '../lib/security.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  assertAuthConfigured();
  const ctx = createTuyaContext();
  const store = await createStore();
  const app = express();

  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '64kb' }));
  app.use(requireAuth);
  app.use('/api', createApiRouter({ ctx, store }));

  if (process.env.HISTORY_POLL !== 'false') {
    startHistoryPoller({ ctx, store });
  }

  app.use(express.static(path.join(__dirname, '../public')));

  return { app, ctx, store };
}

export async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const { app, store } = await createApp();

  const host = process.env.HOST?.trim() || '0.0.0.0';
  const server = app.listen(port, host, () => {
    const bind = host === '0.0.0.0' ? 'localhost' : host;
    console.log(`Soil sensor UI: http://${bind}:${port}`);
    console.log('Auth: required for all pages and APIs (CONFIG_PASSWORD)');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. Stop the old server (Ctrl+C in that terminal, or end the other node process) and run npm start again.`
      );
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGINT', async () => {
    await store.close?.();
    process.exit(0);
  });

  return server;
}
