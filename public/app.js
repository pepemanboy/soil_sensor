import {
  compareDevicesByNumber,
  escapeHtml,
  parseMetricValue,
  parsePlantName,
  statusMap,
} from './metrics.js';

const sensorList = document.getElementById('sensor-list');
const stampEl = document.getElementById('stamp');
const errorEl = document.getElementById('error');
const refreshBtn = document.getElementById('refresh');
const sortByEl = document.getElementById('sort-by');
const chartHoursEl = document.getElementById('chart-hours');
const chartMetricEl = document.getElementById('chart-metric');
const showPlotsCb = document.getElementById('show-plots');

const CHART_METRICS = [
  { code: 'humidity', label: 'Moisture %', color: '#58a6ff' },
  { code: 'temp_current', label: 'Temperature °C', color: '#f0883e' },
  { code: 'battery_percentage', label: 'Battery %', color: '#3fb950' },
];

const ICONS = {
  humidity: `<svg class="metric-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.69l5.66 5.66a6 6 0 1 1-8.49 0L12 2.69z"/></svg>`,
  temp: `<svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0z"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
};

const chartRegistry = new Map();

let lastSnapshot = null;

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login.html?next=${next}`;
}

function formatHumidity(raw) {
  const n = parseMetricValue('humidity', raw);
  return n == null ? '—' : `${Math.round(n)}%`;
}

function formatTemp(raw) {
  const n = parseMetricValue('temp_current', raw);
  return n == null ? '—' : `${n.toFixed(1)}°C`;
}

function formatBattery(raw) {
  const n = parseMetricValue('battery_percentage', raw);
  return n == null ? null : Math.round(Math.max(0, Math.min(100, n)));
}

function batteryColor(pct) {
  if (pct == null) return '#8b949e';
  if (pct <= 20) return '#f85149';
  if (pct <= 50) return '#d29922';
  return '#3fb950';
}

function metricMeta(code) {
  return CHART_METRICS.find((m) => m.code === code) ?? { code, label: code, color: '#8b949e' };
}

function chartHours() {
  return Number(chartHoursEl.value) || 168;
}

function plotsEnabled() {
  return showPlotsCb.checked;
}

function syncPlotsUi() {
  document.body.classList.toggle('show-plots', plotsEnabled());
}

function destroyCharts() {
  for (const chart of chartRegistry.values()) chart.destroy();
  chartRegistry.clear();
}

function showError(msg) {
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = '';
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

async function fetchHistory(deviceId, code, hours) {
  const res = await fetch(
    `/api/history?device_id=${encodeURIComponent(deviceId)}&code=${encodeURIComponent(code)}&hours=${hours}&limit=2000`
  );
  if (res.status === 401) {
    redirectToLogin();
    return [];
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = res.status === 404
      ? ' History API missing — restart the server (npm start).'
      : '';
    throw new Error((body.error || res.statusText) + hint);
  }
  return body.readings ?? [];
}

function formatAxisLabel(ts, hours) {
  const d = new Date(ts);
  if (hours <= 48) {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
}

function destroyChartOnCanvas(canvas) {
  for (const [key, chart] of chartRegistry.entries()) {
    if (chart.canvas === canvas) {
      chart.destroy();
      chartRegistry.delete(key);
    }
  }
}

function renderChart(canvas, readings, metric, hours) {
  const points = readings
    .map((r) => ({ x: r.recorded_at, y: parseMetricValue(metric.code, r.value) }))
    .filter((p) => p.y != null);

  const emptyEl = canvas.parentElement.querySelector('.chart-empty');
  const chartKey = `${canvas.dataset.deviceId || ''}:${metric.code}`;
  canvas.dataset.chartKey = chartKey;

  if (!points.length) {
    destroyChartOnCanvas(canvas);
    canvas.hidden = true;
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = 'No history yet — readings appear after the poller runs.';
    }
    return;
  }

  canvas.hidden = false;
  if (emptyEl) emptyEl.hidden = true;

  const labels = points.map((p) => formatAxisLabel(p.x, hours));
  const data = points.map((p) => p.y);
  const suffix = metric.code === 'temp_current' ? ' °C' : '%';

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metric.label,
        data,
        borderColor: metric.color,
        backgroundColor: `${metric.color}22`,
        fill: true,
        tension: 0.25,
        pointRadius: points.length > 80 ? 0 : 2,
        pointHoverRadius: 3,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              return new Date(points[items[0].dataIndex].x).toLocaleString();
            },
            label(ctx) {
              return `${ctx.parsed.y}${suffix}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#30363d' },
          ticks: { color: '#8b949e', maxTicksLimit: 5, maxRotation: 0 },
        },
        y: {
          grid: { color: '#30363d' },
          ticks: { color: '#8b949e' },
        },
      },
    },
  };

  const existing = chartRegistry.get(chartKey);
  if (existing?.canvas === canvas) {
    existing.data.labels = labels;
    existing.data.datasets[0].data = data;
    existing.data.datasets[0].label = metric.label;
    existing.data.datasets[0].borderColor = metric.color;
    existing.data.datasets[0].backgroundColor = `${metric.color}22`;
    existing.options.scales.y.min = undefined;
    existing.options.scales.y.max = undefined;
    existing.update();
    return;
  }

  destroyChartOnCanvas(canvas);
  chartRegistry.set(chartKey, new Chart(canvas, config));
}

async function loadChartForRow(row) {
  if (!plotsEnabled()) return;

  const deviceId = row.dataset.deviceId;
  const canvas = row.querySelector('canvas');
  if (!deviceId || !canvas) return;

  const hours = chartHours();
  const metric = metricMeta(chartMetricEl.value);
  canvas.dataset.deviceId = deviceId;

  try {
    const readings = await fetchHistory(deviceId, metric.code, hours);
    renderChart(canvas, readings, metric, hours);
  } catch (e) {
    const emptyEl = row.querySelector('.chart-empty');
    canvas.hidden = true;
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = `Chart error: ${e.message}`;
    }
  }
}

async function loadAllCharts() {
  if (!plotsEnabled()) return;
  await Promise.all([...sensorList.querySelectorAll('.sensor-row')].map(loadChartForRow));
}

function buildChartSection() {
  const section = document.createElement('div');
  section.className = 'chart-section';
  section.innerHTML = `
    <div class="chart-wrap">
      <canvas></canvas>
      <div class="chart-empty" hidden>No history yet.</div>
    </div>
  `;
  return section;
}

function buildPlantNameHtml(deviceName, onlineClass, onlineLabel) {
  const { number, label, hasNumber } = parsePlantName(deviceName);
  const numBox = hasNumber
    ? `<span class="plant-num">${escapeHtml(String(number))}</span>`
    : '';
  return `
    <h2>
      ${numBox}
      <span class="plant-title">${escapeHtml(label)}</span>
      <span class="pill ${onlineClass}">${onlineLabel}</span>
    </h2>
  `;
}

function buildBatteryHtml(pct) {
  const fill = pct == null ? 0 : pct;
  const color = batteryColor(pct);
  const value = pct == null ? '—' : `${pct}%`;
  return `
    <div class="metric battery-wrap" title="Battery">
      <div class="battery" aria-label="Battery ${value}">
        <div class="battery-fill" style="width:${fill}%;background:${color}"></div>
      </div>
      <span class="metric-value" style="color:${color}">${value}</span>
    </div>
  `;
}

function buildSensorRow(device, status) {
  const st = statusMap(status);
  const onlineClass = device.online ? 'on' : 'off';
  const onlineLabel = device.online ? 'online' : 'offline';

  const row = document.createElement('article');
  row.className = 'sensor-row';
  row.dataset.deviceId = device.id;

  row.innerHTML = `
    <div class="sensor-main">
      <div class="sensor-name">
        ${buildPlantNameHtml(device.name, onlineClass, onlineLabel)}
      </div>
      <div class="metric humidity" title="Soil moisture">
        ${ICONS.humidity}
        <span class="metric-value">${escapeHtml(formatHumidity(st.humidity))}</span>
      </div>
      <div class="metric temp" title="Temperature">
        ${ICONS.temp}
        <span class="metric-value">${escapeHtml(formatTemp(st.temp_current))}</span>
      </div>
      ${buildBatteryHtml(formatBattery(st.battery_percentage))}
    </div>
  `;

  row.appendChild(buildChartSection());
  return row;
}

function humiditySortKey(status) {
  const n = parseMetricValue('humidity', statusMap(status).humidity);
  return n == null ? Infinity : n;
}

function batterySortKey(status) {
  const n = parseMetricValue('battery_percentage', statusMap(status).battery_percentage);
  return n == null ? Infinity : n;
}

function tempSortKey(status) {
  const n = parseMetricValue('temp_current', statusMap(status).temp_current);
  return n == null ? Infinity : n;
}

function sortDevices(devices, statusById) {
  const mode = sortByEl.value;
  const list = [...devices];

  list.sort((a, b) => {
    const stA = statusById[a.id] ?? [];
    const stB = statusById[b.id] ?? [];

    if (mode === 'number_asc') {
      return compareDevicesByNumber(a, b);
    }
    if (mode === 'number_desc') {
      return compareDevicesByNumber(a, b, { descending: true });
    }
    if (mode === 'moisture_desc') {
      return humiditySortKey(stB) - humiditySortKey(stA);
    }
    if (mode === 'temp_asc') {
      return tempSortKey(stA) - tempSortKey(stB);
    }
    if (mode === 'temp_desc') {
      return tempSortKey(stB) - tempSortKey(stA);
    }
    if (mode === 'battery_asc') {
      return batterySortKey(stA) - batterySortKey(stB);
    }
    if (mode === 'offline_first') {
      const offA = a.online ? 1 : 0;
      const offB = b.online ? 1 : 0;
      if (offA !== offB) return offA - offB;
      return humiditySortKey(stA) - humiditySortKey(stB);
    }
    // moisture_asc (default)
    return humiditySortKey(stA) - humiditySortKey(stB);
  });

  return list;
}

async function renderSensorList(devices, statusById, t) {
  sensorList.innerHTML = '';
  stampEl.textContent = `Last fetch: ${new Date(t).toLocaleString()}`;

  if (!devices.length) {
    sensorList.innerHTML =
      '<p class="meta">No devices returned. Check .env (TUYA_UID, filters) and Smart Life linking.</p>';
    return;
  }

  destroyCharts();
  for (const d of sortDevices(devices, statusById)) {
    sensorList.appendChild(buildSensorRow(d, statusById[d.id] ?? []));
  }
  await loadAllCharts();
}

async function loadSnapshot() {
  showError('');
  refreshBtn.disabled = true;

  try {
    const res = await fetch('/api/snapshot');
    if (res.status === 401) {
      redirectToLogin();
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showError(body.error || res.statusText);
      sensorList.innerHTML = '';
      lastSnapshot = null;
      return;
    }

    lastSnapshot = {
      devices: body.devices ?? [],
      statusById: body.statusById ?? {},
      t: body.t,
    };
    await renderSensorList(lastSnapshot.devices, lastSnapshot.statusById, lastSnapshot.t);
  } catch (e) {
    showError(String(e.message || e));
    sensorList.innerHTML = '';
    destroyCharts();
    lastSnapshot = null;
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadSnapshot);

sortByEl.addEventListener('change', async () => {
  if (!lastSnapshot) return;
  await renderSensorList(lastSnapshot.devices, lastSnapshot.statusById, lastSnapshot.t);
});

showPlotsCb.addEventListener('change', () => {
  syncPlotsUi();
  if (plotsEnabled()) {
    loadAllCharts();
  } else {
    destroyCharts();
  }
});

chartHoursEl.addEventListener('change', loadAllCharts);
chartMetricEl.addEventListener('change', loadAllCharts);

syncPlotsUi();
loadSnapshot();

window.addEventListener('resize', () => {
  for (const chart of chartRegistry.values()) chart.resize();
});
