/** Turn a failed Tuya API response into a throwable Error with code/raw attached. */
export function throwIfTuyaError(response, context = '') {
  if (response?.success) return;
  const suffix = context ? ` for ${context}` : '';
  const err = new Error(response?.msg || `Tuya API error ${response?.code}${suffix}`);
  err.code = response?.code;
  err.raw = response;
  throw err;
}
