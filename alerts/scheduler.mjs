import fs from 'fs';
import path from 'path';
import { dataPath } from '../lib/paths.mjs';
import { loadConfig } from '../config/store.mjs';
import { fetchSnapshot } from '../tuya/snapshot.mjs';
import { evaluateAlerts } from './evaluate.mjs';
import { emailConfigFromEnv, sendAlertEmail } from './email.mjs';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function statePath() {
  return process.env.ALERT_STATE_PATH?.trim() || dataPath('alert-state.json');
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function loadLastSentDate() {
  const file = statePath();
  try {
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.lastSentDate ?? null;
  } catch {
    return null;
  }
}

function saveLastSentDate(dateKey) {
  const file = statePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ lastSentDate: dateKey }, null, 2)}\n`, 'utf8');
}

function alertHourLocal() {
  const hour = Number(process.env.ALERT_HOUR_LOCAL);
  if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return Math.floor(hour);
  return 8;
}

function alertsEnabled() {
  if (process.env.ALERT_EMAIL_ENABLED === 'false') return false;
  return emailConfigFromEnv().enabled;
}

export async function runDailyAlert({ ctx, force = false }) {
  if (!alertsEnabled() && !force) {
    return { skipped: true, reason: 'Email alerts not configured' };
  }

  const today = todayKey();
  if (!force && loadLastSentDate() === today) {
    return { skipped: true, reason: 'Already sent today' };
  }

  const snap = await fetchSnapshot(ctx);
  const config = loadConfig();
  const result = evaluateAlerts({
    devices: snap.devices,
    statusById: snap.statusById,
    config,
  });

  const mail = await sendAlertEmail({ result, generatedAt: new Date() });
  if (!mail.sent) {
    return { skipped: true, reason: mail.reason ?? 'Send failed' };
  }

  saveLastSentDate(today);
  console.log(
    `Daily alert email sent (${result.hasIssues ? 'issues found' : 'all OK'}, message ${mail.messageId})`
  );
  return { sent: true, result, messageId: mail.messageId };
}

function msUntilNextRun(hour) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function startAlertScheduler({ ctx }) {
  if (process.env.ALERT_EMAIL_ENABLED === 'false') {
    console.log('Daily email alerts: disabled (ALERT_EMAIL_ENABLED=false)');
    return () => {};
  }

  const emailCfg = emailConfigFromEnv();
  if (!emailCfg.enabled) {
    console.log(`Daily email alerts: off (${emailCfg.reason})`);
    return () => {};
  }

  const hour = alertHourLocal();
  let timeout;
  let interval;

  const runTick = async () => {
    try {
      await runDailyAlert({ ctx });
    } catch (err) {
      console.error('Daily alert failed:', err.message);
    }
  };

  const scheduleNext = () => {
    const delay = msUntilNextRun(hour);
    console.log(
      `Daily email alerts: next run in ${Math.round(delay / 60_000)} min (local ${hour}:00, to ${emailCfg.to.join(', ')})`
    );
    timeout = setTimeout(async () => {
      await runTick();
      interval = setInterval(runTick, MS_PER_DAY);
    }, delay);
  };

  scheduleNext();
  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };
}
