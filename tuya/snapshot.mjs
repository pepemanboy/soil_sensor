import { fetchAllDevices, applyDeviceFilters, toPublicDevice } from './devices.mjs';
import { throwIfTuyaError } from '../lib/tuya-error.mjs';
import { parseCommaList } from '../lib/env.mjs';

function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

/** Default datapoints worth storing (skip static metadata like temp_unit_convert). */
const DEFAULT_HISTORY_CODES = new Set(['humidity', 'temp_current', 'battery_percentage']);

export function historyCodesFromEnv() {
  const codes = parseCommaList(process.env.HISTORY_CODES);
  return codes ? new Set(codes) : DEFAULT_HISTORY_CODES;
}

export async function fetchSnapshot(ctx) {
  let rawList = await fetchAllDevices(ctx);
  rawList = applyDeviceFilters(rawList);

  const statusById = {};
  const needFetch = [];

  for (const device of rawList) {
    if (Array.isArray(device.status) && device.status.length) {
      statusById[device.id] = device.status;
    } else {
      needFetch.push(device.id);
    }
  }

  for (const group of chunk(needFetch, 20)) {
    const response = await ctx.deviceStatus.statusList({ device_ids: group });
    throwIfTuyaError(response);
    for (const row of response.result ?? []) {
      statusById[row.id] = row.status;
    }
  }

  return {
    devices: rawList.map(toPublicDevice),
    statusById,
    t: Date.now(),
  };
}

export function snapshotToReadings(statusById, recordedAt, codes = historyCodesFromEnv()) {
  const rows = [];
  for (const [deviceId, status] of Object.entries(statusById)) {
    for (const row of status) {
      if (!codes.has(row.code)) continue;
      rows.push({
        device_id: deviceId,
        code: row.code,
        value: String(row.value ?? ''),
        recorded_at: recordedAt,
      });
    }
  }
  return rows;
}
