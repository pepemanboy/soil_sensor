export function parseMetricValue(code, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (code === 'temp_current') return n / 10;
  return n;
}

export function statusMap(status) {
  const map = {};
  for (const row of status) map[row.code] = row.value;
  return map;
}

export function parsePlantName(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d+)\s*[-–—]\s*(.+)$/);
  if (match) {
    return { number: Number(match[1]), label: match[2].trim(), hasNumber: true };
  }
  return { number: null, label: text || '(unnamed)', hasNumber: false };
}

export function compareDevicesByNumber(a, b, { descending = false } = {}) {
  const plantA = parsePlantName(a.name);
  const plantB = parsePlantName(b.name);
  const numA = plantA.number ?? Infinity;
  const numB = plantB.number ?? Infinity;
  if (numA !== numB) return descending ? numB - numA : numA - numB;
  const labelCmp = plantA.label.localeCompare(plantB.label, undefined, { sensitivity: 'base' });
  return descending ? -labelCmp : labelCmp;
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
