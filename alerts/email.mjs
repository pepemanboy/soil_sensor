import nodemailer from 'nodemailer';
import { parseDelimitedList } from '../lib/env.mjs';
import { escapeHtml } from '../lib/html.mjs';

export function emailConfigFromEnv() {
  const to = parseDelimitedList(process.env.ALERT_EMAIL_TO);
  const cc = parseDelimitedList(process.env.ALERT_EMAIL_CC);
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!to.length || !host || !user || !pass) {
    return { enabled: false, reason: 'Set ALERT_EMAIL_TO, SMTP_HOST, SMTP_USER, SMTP_PASS' };
  }

  return {
    enabled: true,
    to,
    cc,
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
  };
}

function sectionLines(title, items, formatter) {
  if (!items.length) return [];
  return [title, ...items.map(formatter), ''];
}

function textToHtml(text) {
  return text
    .split('\n')
    .map((line) => {
      if (!line) return '<br>';
      const escaped = escapeHtml(line);
      if (line.endsWith(':') && !line.startsWith('•')) {
        return `<p><strong>${escaped}</strong></p>`;
      }
      return `<p>${escaped}</p>`;
    })
    .join('\n');
}

export function buildAlertEmail({ result, generatedAt = new Date() }) {
  const dateStr = generatedAt.toLocaleString();
  const { lowMoisture, lowBattery, offline, hasIssues } = result;

  const textParts = [`Soil sensor daily alert — ${dateStr}`, ''];

  if (!hasIssues) {
    textParts.push('All plants look OK (moisture, battery, and online status).');
  } else {
    textParts.push(
      ...sectionLines(
        'Low moisture',
        lowMoisture,
        (row) => `• ${row.display}: ${row.humidity}% (threshold ${row.threshold}%)`
      ),
      ...sectionLines(
        'Low battery',
        lowBattery,
        (row) => `• ${row.display}: ${row.battery}% (threshold ${row.threshold}%)`
      ),
      ...sectionLines('Offline', offline, (row) => `• ${row.display}`)
    );
  }

  const text = textParts.join('\n').trim();
  const issueCount = lowMoisture.length + lowBattery.length + offline.length;
  const subject = hasIssues
    ? `Soil sensors: ${issueCount} plant(s) need attention`
    : 'Soil sensors: all OK';

  return {
    subject,
    text,
    html: `<div style="font-family:system-ui,sans-serif">${textToHtml(text)}</div>`,
  };
}

export async function sendAlertEmail({ result, generatedAt }) {
  const cfg = emailConfigFromEnv();
  if (!cfg.enabled) {
    return { sent: false, reason: cfg.reason };
  }

  const { subject, text, html } = buildAlertEmail({ result, generatedAt });
  const info = await cfg.transport.sendMail({
    from: cfg.from,
    to: cfg.to.join(', '),
    cc: cfg.cc.length ? cfg.cc.join(', ') : undefined,
    subject,
    text,
    html,
  });

  return { sent: true, messageId: info.messageId };
}
