/** Parse comma- or semicolon-separated env values into a trimmed string array. */
export function parseDelimitedList(raw, { separators = /[,;]/ } = {}) {
  return String(raw ?? '')
    .split(separators)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse comma-separated env values; returns undefined when empty. */
export function parseCommaList(raw) {
  const list = parseDelimitedList(raw, { separators: /,/ });
  return list.length ? list : undefined;
}
