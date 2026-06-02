import { compareDevicesByNumber, escapeHtml, parsePlantName } from './metrics.js';

const errorEl = document.getElementById('error');
const saveBtn = document.getElementById('save');
const savedEl = document.getElementById('saved');
const plantsBody = document.getElementById('plants');
const lowBatteryEl = document.getElementById('low-battery');
const defaultMoistureEl = document.getElementById('default-moisture');
let devices = [];
let config = null;

function showError(msg) {
  errorEl.hidden = !msg;
  errorEl.textContent = msg || '';
}

function redirectToLogin() {
  const next = encodeURIComponent('/config.html');
  window.location.href = `/login.html?next=${next}`;
}

async function readJson(res, label) {
  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const hint = text.trimStart().startsWith('<!')
      ? `${label}: server returned HTML instead of JSON. Run npm run dev and try again.`
      : `${label}: unexpected response (${res.status})`;
    throw new Error(hint);
  }
  return JSON.parse(text);
}

function parseOptionalPercent(input) {
  const raw = input.value.trim();
  if (raw === '') return null;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function parseRequiredPercent(input, label) {
  const value = parseOptionalPercent(input);
  if (value == null) throw new Error(`${label} is required (0–100).`);
  return value;
}

function renderPlants() {
  const sorted = [...devices].sort(compareDevicesByNumber);
  plantsBody.innerHTML = sorted
    .map((device) => {
      const { number, label, hasNumber } = parsePlantName(device.name);
      const num = hasNumber ? `<span class="plant-num">${number}</span>` : '';
      const val = config.moistureThresholds?.[device.id] ?? '';
      return `
        <tr data-device-id="${escapeHtml(device.id)}">
          <td>${num}${escapeHtml(label)}</td>
          <td>
            <input type="number" class="moisture-threshold" min="0" max="100" step="1"
              value="${val === '' ? '' : val}" placeholder="default" />
          </td>
        </tr>
      `;
    })
    .join('');
}

function applyConfigToForm() {
  lowBatteryEl.value = config.lowBatteryPercent;
  defaultMoistureEl.value = config.defaultMoisturePercent;
  renderPlants();
}

function collectConfigFromForm() {
  const moistureThresholds = {};
  for (const row of plantsBody.querySelectorAll('tr[data-device-id]')) {
    const id = row.dataset.deviceId;
    const input = row.querySelector('.moisture-threshold');
    const value = parseOptionalPercent(input);
    if (value != null) moistureThresholds[id] = value;
  }
  return {
    lowBatteryPercent: parseOptionalPercent(lowBatteryEl) ?? 20,
    defaultMoisturePercent: parseRequiredPercent(
      defaultMoistureEl,
      'Default low moisture'
    ),
    moistureThresholds,
  };
}

async function load() {
  showError('');
  saveBtn.disabled = true;
  try {
    const [snapRes, cfgRes] = await Promise.all([
      fetch('/api/snapshot'),
      fetch('/api/config'),
    ]);
    const snap = await readJson(snapRes, 'Snapshot');
    const cfgPayload = await readJson(cfgRes, 'Config');
    if (!snapRes.ok) throw new Error(snap.error || `Snapshot ${snapRes.status}`);
    if (!cfgRes.ok) throw new Error(cfgPayload.error || `Config ${cfgRes.status}`);

    devices = snap.devices ?? [];
    config = cfgPayload.config;
    applyConfigToForm();
  } catch (err) {
    showError(err.message);
  } finally {
    saveBtn.disabled = false;
  }
}

async function save() {
  showError('');
  savedEl.hidden = true;
  saveBtn.disabled = true;
  try {
    const body = collectConfigFromForm();
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await readJson(res, 'Save');
    if (!res.ok) throw new Error(data.error || `Save failed ${res.status}`);
    config = data.config;
    applyConfigToForm();
    savedEl.hidden = false;
    setTimeout(() => { savedEl.hidden = true; }, 2500);
  } catch (err) {
    showError(err.message);
  } finally {
    saveBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', save);
load();
