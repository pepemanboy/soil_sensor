/**
 * Help figure out what to put in .env for device listing.
 *
 * Usage:
 *   node discover.mjs                  — show config status + where to find values
 *   node discover.mjs <device_id>        — test detail/status for one device (from Tuya console)
 */

import 'dotenv/config';
import { createTuyaContext } from './tuya/context.mjs';
import {
  fetchAllDevices,
  applyDeviceFilters,
  deviceIdsFromEnv,
  categoriesFromEnv,
  productIdsFromEnv,
} from './tuya/devices.mjs';

const baseUrl = process.env.TUYA_BASE_URL;
const accessKey = process.env.TUYA_ACCESS_ID;
const secretKey = process.env.TUYA_ACCESS_SECRET;
const schema = process.env.TUYA_SCHEMA?.trim();
const homeId = process.env.TUYA_HOME_ID?.trim();
const uid = process.env.TUYA_UID?.trim();
const deviceIds = deviceIdsFromEnv();
const categories = categoriesFromEnv();
const productIds = productIdsFromEnv();
const deviceIdArg = process.argv[2]?.trim();

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function miss(msg) {
  console.log(`  ✗ ${msg}`);
}

if (!baseUrl || !accessKey || !secretKey) {
  console.error('Missing TUYA_BASE_URL, TUYA_ACCESS_ID, or TUYA_ACCESS_SECRET in .env');
  process.exit(1);
}

const ctx = createTuyaContext();

section('Credentials');
ok(`Base URL: ${baseUrl}`);
ok(`Access ID: ${accessKey.slice(0, 4)}…`);

section('Device discovery config (need ONE)');
if (schema) ok(`TUYA_SCHEMA=${schema}`);
else miss('TUYA_SCHEMA not set');
if (homeId) ok(`TUYA_HOME_ID=${homeId}`);
else miss('TUYA_HOME_ID not set');
if (uid) ok(`TUYA_UID=${uid}`);
else miss('TUYA_UID not set');
if (deviceIds?.length) ok(`TUYA_DEVICE_IDS=${deviceIds.join(',')}`);
else miss('TUYA_DEVICE_IDS not set (optional filter)');

section('Optional filters');
if (categories?.length) ok(`category filter: ${categories.join(', ')}`);
else miss('TUYA_DEVICE_CATEGORY not set');
if (productIds?.length) ok(`product filter: ${productIds.join(', ')}`);
else miss('TUYA_PRODUCT_IDS not set (optional)');

if (!schema && !homeId && !uid && !deviceIds?.length) {
  section('What to do next');
  console.log(`
  Easiest path for Smart Life (no custom app):

  1. Open https://platform.tuya.com/ → Cloud → your project → Devices tab.
  2. Confirm your soil sensors appear (link Smart Life if not).
  3. Copy a device ID from the list.
  4. Run:  node discover.mjs <that_device_id>
     This tests API access without listing all devices.
  5. Add to .env:  TUYA_DEVICE_IDS=<id1>,<id2>,...
     Or filter by type:  TUYA_DEVICE_CATEGORY=zwjcy  (plant monitor / soil sensor)
     Then npm start works without listing every device ID.

  To auto-discover all devices instead, add ONE line to .env:

  • TUYA_UID=ay…     — User ID shown near linked Smart Life account / devices in console.
  • TUYA_HOME_ID=…   — Home ID from the homes API or console (if visible).
  • TUYA_SCHEMA=…    — Only if you created an OEM/SDK app (App → your app → Channel Identifier).

  Also subscribe to Smart Home APIs in Cloud → your project → API / Services
  (permission errors 1106 / 2884 usually mean missing subscription).
`);
}

if (deviceIdArg) {
  section(`Testing device ${deviceIdArg}`);
  try {
    const [detail, status] = await Promise.all([
      ctx.device.detail({ device_id: deviceIdArg }),
      ctx.deviceStatus.status({ device_id: deviceIdArg }),
    ]);
    console.log(JSON.stringify({ detail, status }, null, 2));
    if (!detail.success || !status.success) process.exitCode = 1;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

if (uid) {
  section('Homes for TUYA_UID');
  try {
    const r = await ctx.request({
      method: 'GET',
      path: `/v1.0/users/${encodeURIComponent(uid)}/homes`,
      body: {},
    });
    if (!r.success) {
      console.error(JSON.stringify(r, null, 2));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify(r.result, null, 2));
    }
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

if (schema || homeId || uid || deviceIds?.length) {
  section('Device list test');
  try {
    const devices = applyDeviceFilters(await fetchAllDevices(ctx));
    console.log(JSON.stringify({ total: devices.length, devices: devices.map((d) => ({ id: d.id, name: d.name, online: d.online, category: d.category })) }, null, 2));
  } catch (e) {
    console.error(e.message);
    if (e.raw) console.error(JSON.stringify(e.raw, null, 2));
    process.exitCode = 1;
  }
}
