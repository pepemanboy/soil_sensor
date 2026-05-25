/**
 * Load devices linked to your cloud project / Smart Life account.
 *
 * Use one of:
 * - TUYA_SCHEMA — Smart Home application schema ID (Cloud → your project → find App / Schema).
 *   Then we call GET /v1.0/devices with pagination.
 * - TUYA_HOME_ID — a single home id; GET /v1.0/homes/{id}/devices
 * - TUYA_UID — Smart Life user id (e.g. ay... from the developer console); we list homes and merge devices.
 * - TUYA_DEVICE_IDS — comma-separated IDs from the developer console (works without the above).
 */

import { parseCommaList } from '../lib/env.mjs';
import { throwIfTuyaError } from '../lib/tuya-error.mjs';

export function deviceIdsFromEnv() {
  return parseCommaList(process.env.TUYA_DEVICE_IDS);
}

export async function fetchAllDevices(ctx) {
  const schema = process.env.TUYA_SCHEMA?.trim();
  const homeId = process.env.TUYA_HOME_ID?.trim();
  const uid = process.env.TUYA_UID?.trim();
  const deviceIds = deviceIdsFromEnv();

  if (schema) return fetchViaSchema(ctx, schema);
  if (homeId) return fetchViaHome(ctx, homeId);
  if (uid) return fetchViaUserHomes(ctx, uid);
  if (deviceIds?.length) return fetchViaDeviceIds(ctx, deviceIds);

  throw new Error(
    'Set TUYA_SCHEMA, TUYA_HOME_ID, TUYA_UID, or TUYA_DEVICE_IDS in .env (see .env.example). ' +
      'Without one of these, Tuya cannot enumerate your devices.'
  );
}

async function fetchViaSchema(ctx, schema) {
  const pageSize = 50;
  let page_no = 1;
  const devices = [];

  for (;;) {
    const response = await ctx.request({
      method: 'GET',
      path: '/v1.0/devices',
      query: { page_no, page_size: pageSize, schema },
      body: {},
    });
    throwIfTuyaError(response);

    const batch = response.result?.devices ?? [];
    devices.push(...batch);
    const total = Number(response.result?.total ?? batch.length);

    if (!batch.length || devices.length >= total) break;
    page_no += 1;
    if (page_no > 100) break;
  }

  return devices;
}

async function fetchViaHome(ctx, home_id) {
  const response = await ctx.request({
    method: 'GET',
    path: `/v1.0/homes/${home_id}/devices`,
    body: {},
  });
  throwIfTuyaError(response);
  return response.result ?? [];
}

async function fetchViaUserHomes(ctx, uid) {
  const response = await ctx.request({
    method: 'GET',
    path: `/v1.0/users/${encodeURIComponent(uid)}/homes`,
    body: {},
  });
  throwIfTuyaError(response);

  const homes = response.result ?? [];
  const byId = new Map();

  for (const home of homes) {
    const list = await fetchViaHome(ctx, String(home.home_id));
    for (const device of list) {
      byId.set(device.id, device);
    }
  }

  return [...byId.values()];
}

async function fetchViaDeviceIds(ctx, ids) {
  const devices = [];
  for (const id of ids) {
    const response = await ctx.device.detail({ device_id: id });
    throwIfTuyaError(response, `device ${id}`);
    devices.push(response.result);
  }
  return devices;
}

export function filterByDeviceIds(devices, ids) {
  if (!ids?.length) return devices;
  const set = new Set(ids);
  return devices.filter((d) => set.has(d.id));
}

/** Tuya category codes, e.g. zwjcy = plant monitor / soil sensor. */
export function categoriesFromEnv() {
  const multi = process.env.TUYA_DEVICE_CATEGORIES?.trim();
  const single = process.env.TUYA_DEVICE_CATEGORY?.trim();
  if (multi) return parseCommaList(multi);
  if (single) return [single];
  return undefined;
}

export function productIdsFromEnv() {
  return parseCommaList(process.env.TUYA_PRODUCT_IDS);
}

export function filterByCategory(devices, categories) {
  if (!categories?.length) return devices;
  const set = new Set(categories.map((c) => c.toLowerCase()));
  return devices.filter((d) => set.has(String(d.category ?? '').toLowerCase()));
}

export function filterByProductId(devices, productIds) {
  if (!productIds?.length) return devices;
  const set = new Set(productIds);
  return devices.filter((d) => set.has(d.product_id));
}

/** Optional filters applied after discovery (IDs, category, product_id). */
export function applyDeviceFilters(devices) {
  let list = devices;
  list = filterByDeviceIds(list, deviceIdsFromEnv());
  list = filterByCategory(list, categoriesFromEnv());
  list = filterByProductId(list, productIdsFromEnv());
  return list;
}

/** Strip secrets before sending device info to the browser. */
export function toPublicDevice(d) {
  return {
    id: d.id,
    name: d.name,
    category: d.category,
    product_id: d.product_id,
    product_name: d.product_name,
    online: d.online,
    sub: d.sub,
  };
}
