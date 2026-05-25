import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Project root directory. */
export function projectRoot() {
  return ROOT;
}

/** Path under `data/` (or `DATA_DIR` when set). */
export function dataPath(...segments) {
  const base = process.env.DATA_DIR?.trim() || path.join(ROOT, 'data');
  return path.join(base, ...segments);
}
