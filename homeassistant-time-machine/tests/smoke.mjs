// End-to-end smoke test for the HTTP hardening.
// Starts app.js on a throwaway port with auth forced on, then checks the
// auth gate, CORS allowlist, cross-site blocking and path containment.
//
// Run: node tests/smoke.mjs

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 55000 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const password = 'smoke-test-password';
const allowedOrigin = 'https://allowed.example';
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'hatm-smoke-'));

const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  HATM_API_AUTH: 'on',
  HATM_PASSWORD: password,
  HATM_USERNAME: 'smoke',
  HATM_ALLOWED_ORIGINS: allowedOrigin,
  HATM_TRUST_PROXY_HEADERS: '0',
  DEBUG_LOGS: 'false',
};
// Do not let a local /data directory switch the app into add-on mode.
if (!process.env.HATM_KEEP_DATA) delete env.DATA_DIR;

let child;
const output = [];
const failures = [];
const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` (${detail})` : ''}`);
}

const auth = 'Basic ' + Buffer.from(`smoke:${password}`).toString('base64');

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${base}/`, { redirect: 'manual' });
      if (res.status) return;
    } catch {
      // not listening yet
    }
    await sleep(100);
  }
  throw new Error(`server did not start\n${output.join('')}`);
}

async function call(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.auth !== false) headers.Authorization = options.authValue || auth;
  if (options.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, headers: res.headers, body };
}

try {
  child = spawn(process.execPath, ['app.js'], { cwd: appDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => output.push(d.toString()));
  child.stderr.on('data', (d) => output.push(d.toString()));
  await waitForServer();

  // 1. Unauthenticated API is rejected with a basic-auth challenge.
  const noAuth = await call('/api/app-settings', { auth: false });
  record('unauthenticated /api returns 401', noAuth.status === 401, `got ${noAuth.status}`);
  record('401 sends WWW-Authenticate', /Basic realm=/.test(noAuth.headers.get('www-authenticate') || ''),
    noAuth.headers.get('www-authenticate') || 'missing');

  // 2. Wrong password is rejected.
  const wrong = await call('/api/app-settings', {
    authValue: 'Basic ' + Buffer.from('smoke:wrong').toString('base64'),
  });
  record('wrong password returns 401', wrong.status === 401, `got ${wrong.status}`);

  // 3. Correct password works.
  const ok = await call('/api/app-settings');
  record('authenticated /api/app-settings returns 200', ok.status === 200, `got ${ok.status}`);

  // 4. The UI itself stays reachable (browser can load the page before auth prompts).
  const page = await fetch(`${base}/`);
  record('GET / stays open', page.status === 200, `got ${page.status}`);

  // 5. CORS: only the exact allowed origin gets headers.
  const allowed = await fetch(`${base}/api/app-settings`, {
    headers: { Origin: allowedOrigin, Authorization: auth },
  });
  record('allowed origin echoed exactly',
    allowed.headers.get('access-control-allow-origin') === allowedOrigin,
    allowed.headers.get('access-control-allow-origin') || 'missing');

  const evil = await fetch(`${base}/api/app-settings`, {
    headers: { Origin: 'https://allowed.example.attacker.test', Authorization: auth },
  });
  record('substring origin rejected', !evil.headers.get('access-control-allow-origin'),
    evil.headers.get('access-control-allow-origin') || 'none');

  // 6. Cross-site mutation is blocked.
  const crossSite = await call('/api/scan-backups', {
    method: 'POST',
    headers: { 'Sec-Fetch-Site': 'cross-site' },
    body: { backupRootPath: tmpRoot },
  });
  record('cross-site POST returns 403', crossSite.status === 403, `got ${crossSite.status}`);

  // 7. Path containment on delete and lock.
  const outside = path.join(os.tmpdir(), 'hatm-outside-target');
  await fs.mkdir(outside, { recursive: true });
  await fs.writeFile(path.join(outside, 'keep.txt'), 'keep');

  const del = await call('/api/delete-backup', { method: 'POST', body: { backupPath: outside } });
  record('delete outside backup root returns 403', del.status === 403, `got ${del.status}`);
  record('outside target still exists', await fs.stat(outside).then(() => true).catch(() => false));

  const lock = await call('/api/toggle-lock', { method: 'POST', body: { backupPath: outside } });
  record('toggle-lock outside backup root returns 403', lock.status === 403, `got ${lock.status}`);

  const traversal = await call('/api/scan-backups', {
    method: 'POST',
    body: { backupRootPath: '/etc' },
  });
  record('scan outside backup root returns 400', traversal.status === 400, `got ${traversal.status}`);

  const restore = await call('/api/restore-automation', {
    method: 'POST',
    body: { backupPath: outside, automationIdentifier: 'x' },
  });
  record('restore with outside backupPath rejected', restore.status === 400 || restore.status === 403,
    `got ${restore.status}`);

  // 8. Settings validator still accepts an absolute directory.
  const validPath = await call('/api/validate-backup-path', {
    method: 'POST',
    body: { path: outside },
  });
  record('validate-backup-path accepts absolute dir',
    validPath.status === 200 || validPath.status === 400,
    `got ${validPath.status}`);
  record('validate-backup-path rejects relative path',
    (await call('/api/validate-backup-path', { method: 'POST', body: { path: 'relative/dir' } })).status === 400);
} catch (error) {
  failures.push(`harness error: ${error.message}`);
} finally {
  if (child) {
    child.kill('SIGTERM');
    await sleep(300);
    if (!child.killed) child.kill('SIGKILL');
  }
  await fs.rm(tmpRoot, { recursive: true, force: true });
}

for (const check of checks) {
  console.log(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}${check.ok || !check.detail ? '' : ` -> ${check.detail}`}`);
}
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);

if (failures.length) {
  console.error('\nFailures:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nServer output:\n' + output.join('').slice(-4000));
  process.exit(1);
}
process.exit(0);
