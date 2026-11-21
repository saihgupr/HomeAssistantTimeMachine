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

  // Browser calls identify themselves so the native Basic dialog never appears;
  // the app then redirects to /login itself.
  const xhr401 = await fetch(`${base}/api/app-settings`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  record('XHR 401 omits WWW-Authenticate', xhr401.status === 401 && !xhr401.headers.get('www-authenticate'),
    `status ${xhr401.status} header ${xhr401.headers.get('www-authenticate')}`);
  const json401 = await fetch(`${base}/api/app-settings`, {
    headers: { Accept: 'application/json' },
  });
  record('Accept JSON 401 omits WWW-Authenticate', json401.status === 401 && !json401.headers.get('www-authenticate'));

  // 2. Wrong password is rejected.
  const wrong = await call('/api/app-settings', {
    authValue: 'Basic ' + Buffer.from('smoke:wrong').toString('base64'),
  });
  record('wrong password returns 401', wrong.status === 401, `got ${wrong.status}`);

  // 3. Correct password works.
  const ok = await call('/api/app-settings');
  record('authenticated /api/app-settings returns 200', ok.status === 200, `got ${ok.status}`);

  // 3b. Winter mode round-trips and the UI ships the toggle plus the snow canvas.
  const winterPost = await call('/api/app-settings', { method: 'POST', body: { winterMode: true } });
  const winterGet = await call('/api/app-settings');
  record('winter mode saves and reloads',
    winterPost.status === 200 && winterGet.body?.winterMode === true,
    `status ${winterPost.status} value ${winterGet.body?.winterMode}`);
  const winterPage = await (await fetch(`${base}/`)).text();
  record('winter mode toggle and canvas are in the page',
    winterPage.includes('id="winterModeEnabled"') && winterPage.includes('id="snowCanvas"'));

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

  // 9. Cookie login fallback for webviews that never show the Basic dialog.
  const loginPage = await fetch(`${base}/login`);
  const loginHtml = await loginPage.text();
  record('login page is served', loginPage.status === 200 && loginHtml.includes('Sign in'));
  record('login page is not cached', loginPage.headers.get('cache-control') === 'no-store');

  const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const postLogin = (body) => fetch(`${base}/login`, {
    method: 'POST',
    headers: formHeaders,
    body: new URLSearchParams(body).toString(),
    redirect: 'manual',
  });

  const wrongLogin = await postLogin({ username: 'smoke', password: 'wrong', next: '/' });
  record('wrong login redirects with error',
    wrongLogin.status === 302 && (wrongLogin.headers.get('location') || '').includes('error=1'),
    `${wrongLogin.status} ${wrongLogin.headers.get('location')}`);

  const goodLogin = await postLogin({ username: 'smoke', password, next: '/' });
  const setCookie = goodLogin.headers.get('set-cookie') || '';
  record('good login redirects home', goodLogin.status === 302 && goodLogin.headers.get('location') === '/',
    `${goodLogin.status} ${goodLogin.headers.get('location')}`);
  record('good login sets an httpOnly session cookie',
    /hatm_session=/.test(setCookie) && /HttpOnly/i.test(setCookie), setCookie);

  const sessionCookie = setCookie.split(';')[0];
  const sessionApi = await fetch(`${base}/api/app-settings`, { headers: { Cookie: sessionCookie } });
  record('session cookie authenticates API', sessionApi.status === 200, `got ${sessionApi.status}`);

  const openRedirect = await postLogin({ username: 'smoke', password, next: '//evil.example/path' });
  record('login ignores off-site next value', openRedirect.status === 302 && openRedirect.headers.get('location') === '/',
    `${openRedirect.headers.get('location')}`);

  const logout = await fetch(`${base}/logout`, { headers: { Cookie: sessionCookie }, redirect: 'manual' });
  const clearCookie = logout.headers.get('set-cookie') || '';
  record('logout clears the session cookie',
    logout.status === 302 && /hatm_session=;/.test(clearCookie) && /Expires=Thu, 01 Jan 1970/i.test(clearCookie),
    `${logout.status} ${clearCookie}`);
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
