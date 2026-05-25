import 'dotenv/config';
import { createTuyaContext } from './tuya/context.mjs';
import { fetchAllDevices, applyDeviceFilters } from './tuya/devices.mjs';

const deviceIdArg = process.argv[2];
const ctx = createTuyaContext();

const main = async () => {
  if (deviceIdArg) {
    const [detail, status] = await Promise.all([
      ctx.device.detail({ device_id: deviceIdArg }),
      ctx.deviceStatus.status({ device_id: deviceIdArg }),
    ]);
    console.log(JSON.stringify({ detail, status }, null, 2));
    if (!detail.success || !status.success) process.exitCode = 1;
    return;
  }

  try {
    let devices = await fetchAllDevices(ctx);
    devices = applyDeviceFilters(devices);
    console.log(JSON.stringify({ total: devices.length, devices }, null, 2));
  } catch (e) {
    console.error(e.message, e.raw ? JSON.stringify(e.raw, null, 2) : '');
    process.exitCode = 1;
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
