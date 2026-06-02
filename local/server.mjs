import { startServer } from './app.mjs';

try {
  await startServer();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
