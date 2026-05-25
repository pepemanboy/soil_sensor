export function parseMetricValue(code, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (code === 'temp_current') return n / 10;
  return n;
}

export function statusMap(status) {
  const map = {};
  for (const row of status ?? []) map[row.code] = row.value;
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

export function formatPlantDisplay(name) {
  const { number, label, hasNumber } = parsePlantName(name);
  if (hasNumber) return `${number} — ${label}`;
  return label;
}

export function compareDevicesByNumber(a, b) {
  const plantA = parsePlantName(a.name);
  const plantB = parsePlantName(b.name);
  const numA = plantA.number ?? Infinity;
  const numB = plantB.number ?? Infinity;
  if (numA !== numB) return numA - numB;
  return plantA.label.localeCompare(plantB.label, undefined, { sensitivity: 'base' });
}
