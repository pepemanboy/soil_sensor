import {
  compareDevicesByNumber,
  formatPlantDisplay,
  parseMetricValue,
  statusMap,
} from '../metrics.mjs';
import { moistureThresholdForDevice } from '../config/store.mjs';

export function evaluateAlerts({ devices, statusById, config }) {
  const lowMoisture = [];
  const lowBattery = [];
  const offline = [];

  for (const device of [...devices].sort(compareDevicesByNumber)) {
    const display = formatPlantDisplay(device.name);

    if (!device.online) {
      offline.push({ device, display });
      continue;
    }

    const status = statusMap(statusById[device.id] ?? []);
    const humidity = parseMetricValue('humidity', status.humidity);
    const threshold = moistureThresholdForDevice(config, device.id);

    if (threshold != null && humidity != null && humidity < threshold) {
      lowMoisture.push({
        device,
        display,
        humidity: Math.round(humidity),
        threshold,
      });
    }

    const battery = parseMetricValue('battery_percentage', status.battery_percentage);
    if (battery != null && battery <= config.lowBatteryPercent) {
      lowBattery.push({
        device,
        display,
        battery: Math.round(battery),
        threshold: config.lowBatteryPercent,
      });
    }
  }

  const issueCount = lowMoisture.length + lowBattery.length + offline.length;

  return {
    lowMoisture,
    lowBattery,
    offline,
    hasIssues: issueCount > 0,
  };
}
