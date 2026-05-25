import { TuyaContext } from '@tuya/tuya-connector-nodejs';

/** Shared Tuya Open API client from environment variables. */
export function createTuyaContext() {
  const baseUrl = process.env.TUYA_BASE_URL;
  const accessKey = process.env.TUYA_ACCESS_ID;
  const secretKey = process.env.TUYA_ACCESS_SECRET;
  if (!baseUrl || !accessKey || !secretKey) {
    throw new Error('Set TUYA_BASE_URL, TUYA_ACCESS_ID, TUYA_ACCESS_SECRET in .env');
  }
  return new TuyaContext({ baseUrl, accessKey, secretKey });
}
