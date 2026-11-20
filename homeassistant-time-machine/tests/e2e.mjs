// Full end-to-end test. Requires Linux root and HATM_E2E_DESTRUCTIVE=1,
// because it creates and removes /config, /media/timemachine and /data.
//
// Run inside the disposable test container:
//   HATM_E2E_DESTRUCTIVE=1 node tests/e2e.mjs
//
// It exercises auth, scanning, listing, restoring a real automation,
// symlink/traversal refusal, deletion, and add-on mode (no auth by default).

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 56000 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const password = 'e2e-password';
const auth = 'Basic ' + Buffer.from(`e2e:${password}`).toString('base64');
const checks = [];
const failures = [];
const output = [];

const LIVE = '/config';
const BACKUPS = '/media/timemachine';
const DATA = '/data';

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` (${detail})` : ''}`);
}

async function call(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.auth !== false) headers.Authorization = auth;
  if (options.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let body = null;
  const text = await res.text();
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, headers: res.headers, body };
}

let child;
function startServer(env) {
  child = spawn(process.execPath, ['app.js'], {
    cwd: appDir,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => output.push(d.toString()));
  child.stderr.on('data', (d) => output.push(d.toString()));
}

async function waitForServer() {
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`${base}/`, { redirect: 'manual' });
      if (res.status) return;
    } catch { /* not yet */ }
    await sleep(100);
  }
  throw new Error(`server did not start\n${output.slice(-60).join('')}`);
}

async function stopServer() {
  if (!child) return;
  child.kill('SIGTERM');
  await sleep(500);
  child.kill('SIGKILL');
  child = null;
}

const AUTOMATIONS_BACKUP = `- id: '1111111111'
  alias: Kitchen lights
  triggers:
    - trigger: state
      entity_id: binary_sensor.motion
  actions:
    - action: light.turn_on
      target:
        entity_id: light.kitchen
- id: '2222222222'
  alias: Porch lights
  triggers:
    - trigger: sun
      event: sunset
  actions:
    - action: light.turn_on
      target:
        entity_id: light.porch
`;

const AUTOMATIONS_LIVE = `- id: '1111111111'
  alias: Kitchen lights changed live
  triggers:
    - trigger: state
      entity_id: binary_sensor.motion
  actions:
    - action: light.turn_off
      target:
        entity_id: light.kitchen
`;

async function makeFixture(backupName = 'backup-2026-01-01_120000') {
  const backupPath = path.join(BACKUPS, backupName);
  await fs.mkdir(path.join(backupPath, '.storage'), { recursive: true });
  await fs.writeFile(path.join(backupPath, 'automations.yaml'), AUTOMATIONS_BACKUP, 'utf-8');
  await fs.writeFile(path.join(backupPath, 'scripts.yaml'), 'morning: []\n', 'utf-8');
  await fs.writeFile(path.join(backupPath, '.backup_manifest.json'), JSON.stringify({
    timestamp: '2026-01-01T12:00:00Z',
    automation_files: ['automations.yaml'],
    script_files: ['scripts.yaml'],
    files: { root: ['automations.yaml', 'scripts.yaml'], storage: [] },
  }, null, 2), 'utf-8');
  return backupPath;
}

if (process.getuid?.() !== 0) {
  console.error('Run as root: this test creates /config, /media/timemachine and /data.');
  process.exit(2);
}
if (process.env.HATM_E2E_DESTRUCTIVE !== '1') {
  console.error('Set HATM_E2E_DESTRUCTIVE=1 to acknowledge that the test cleans up those paths.');
  process.exit(2);
}

try {
  for (const dir of [LIVE, BACKUPS, DATA]) {
    await fs.rm(dir, { recursive: true, force: true });
  }
  await fs.mkdir(LIVE, { recursive: true });
  await fs.mkdir(BACKUPS, { recursive: true });
  await fs.writeFile(path.join(LIVE, 'automations.yaml'), AUTOMATIONS_LIVE, 'utf-8');
  await fs.writeFile(path.join(LIVE, 'configuration.yaml'), 'automation: !include automations.yaml\n', 'utf-8');
  const backupPath = await makeFixture();

  // ---- Standalone / Docker mode: auth on by default ----
  startServer({ HATM_API_AUTH: 'on', HATM_PASSWORD: password, HATM_USERNAME: 'e2e' });
  await waitForServer();

  record('unauthenticated API blocked', (await call('/api/health', { auth: false })).status === 401);

  const scan = await call('/api/scan-backups', { method: 'POST', body: { backupRootPath: BACKUPS } });
  record('scan finds the fixture backup',
    scan.status === 200 && Array.isArray(scan.body?.backups) && scan.body.backups.length === 1,
    JSON.stringify(scan.body).slice(0, 200));

  const autoList = await call('/api/get-backup-automations', { method: 'POST', body: { backupPath } });
  record('backup automation list has 2 entries',
    autoList.status === 200 && autoList.body?.automations?.length === 2,
    JSON.stringify(autoList.body).slice(0, 200));

  const restore = await call('/api/restore-automation', {
    method: 'POST',
    body: { backupPath, automationIdentifier: '1111111111' },
  });
  const liveAfter = await fs.readFile(path.join(LIVE, 'automations.yaml'), 'utf-8');
  record('restore-automation succeeds', restore.status === 200, `got ${restore.status} ${JSON.stringify(restore.body).slice(0, 160)}`);
  record('restored automation is the backup version', liveAfter.includes('light.turn_on') && !liveAfter.includes('light.turn_off'));
  record('non-requested automation is not imported', !liveAfter.includes('Porch lights'));

  // Symlink escape must be refused for delete.
  await fs.symlink('/etc', path.join(BACKUPS, 'evil-link'));
  const symlinkDelete = await call('/api/delete-backup', { method: 'POST', body: { backupPath: path.join(BACKUPS, 'evil-link') } });
  record('delete through symlink refused', symlinkDelete.status === 403, `got ${symlinkDelete.status}`);
  record('/etc survived', existsSync('/etc/passwd'));

  // Traversal escape refused.
  const outsideDelete = await call('/api/delete-backup', { method: 'POST', body: { backupPath: '/tmp' } });
  record('delete outside root refused', outsideDelete.status === 403, `got ${outsideDelete.status}`);

  // Real deletion works.
  const realDelete = await call('/api/delete-backup', { method: 'POST', body: { backupPath } });
  record('delete inside root succeeds', realDelete.status === 200, `got ${realDelete.status}`);
  record('backup folder removed', !existsSync(backupPath));

  // Scheduled jobs trigger /api/backup-now over localhost; that internal call
  // must satisfy the password gate.
  const schedule = await call('/api/schedule-backup', {
    method: 'POST',
    body: {
      id: 'e2e-job',
      cronExpression: '* * * * *',
      enabled: true,
      timezone: 'UTC',
      liveConfigPath: LIVE,
      backupFolderPath: BACKUPS,
      maxBackupsEnabled: false,
      maxBackupsCount: 100,
      smartBackupEnabled: false,
    },
  });
  record('schedule created', schedule.status === 200, `got ${schedule.status}`);

  async function findDatedBackups(dir, found = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (/^\d{4}-\d{2}-\d{2}-\d{6}$/.test(entry.name)) found.push(full);
      else await findDatedBackups(full, found);
    }
    return found;
  }

  let scheduledBackups = [];
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    scheduledBackups = await findDatedBackups(BACKUPS);
    if (scheduledBackups.length > 0) break;
  }
  record('scheduled job triggered a backup through the password gate',
    scheduledBackups.length > 0, 'no timestamped backup after 80s');

  // Security headers in standalone mode.
  const page = await fetch(`${base}/`);
  record('standalone sends X-Frame-Options DENY', page.headers.get('x-frame-options') === 'DENY');
  record('standalone sends nosniff', page.headers.get('x-content-type-options') === 'nosniff');

  // Ingress header trust: standalone must ignore a forged prefix.
  const forgedStandalone = await fetch(`${base}/forged-prefix/api/health`, {
    headers: { 'X-Ingress-Path': '/forged-prefix', Authorization: auth },
  });
  record('forged ingress prefix ignored in standalone', forgedStandalone.status === 404,
    `got ${forgedStandalone.status}`);

  await stopServer();

  // ---- Add-on mode: /data/options.json exists ----
  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(path.join(DATA, 'options.json'), JSON.stringify({ theme: 'dark' }), 'utf-8');
  await makeFixture('backup-2026-01-02_120000');

  startServer({ HATM_PASSWORD: password });
  await waitForServer();

  record('add-on mode needs no auth by default', (await call('/api/health', { auth: false })).status === 200);
  const addonPage = await fetch(`${base}/`);
  record('add-on mode does not send X-Frame-Options', !addonPage.headers.get('x-frame-options'));
  record('add-on mode still sends nosniff', addonPage.headers.get('x-content-type-options') === 'nosniff');

  // In add-on mode the Supervisor is the proxy, so its prefix header is trusted and stripped.
  const trustedAddon = await fetch(`${base}/forged-prefix/api/health`, {
    headers: { 'X-Ingress-Path': '/forged-prefix' },
  });
  record('supervisor ingress prefix trusted in add-on mode', trustedAddon.status === 200,
    `got ${trustedAddon.status}`);
} catch (error) {
  failures.push(`harness error: ${error.message}`);
} finally {
  await stopServer();
  await fs.rm('/config', { recursive: true, force: true }).catch(() => {});
  await fs.rm('/media/timemachine', { recursive: true, force: true }).catch(() => {});
  await fs.rm('/data', { recursive: true, force: true }).catch(() => {});
}

for (const check of checks) {
  console.log(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}${check.ok || !check.detail ? '' : ` -> ${check.detail}`}`);
}
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nServer output:\n' + output.join('').slice(-5000));
  process.exit(1);
}
process.exit(0);
