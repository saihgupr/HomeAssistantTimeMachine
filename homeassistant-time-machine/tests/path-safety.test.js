const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs').promises;

const {
  resolveInside,
  isInside,
  realPathInside,
  realPathInsideParent,
} = require('../utils/path-safety');

test('resolveInside keeps a nested path under the root', () => {
  const root = path.join(os.tmpdir(), 'hatm-root');
  assert.equal(resolveInside(root, 'a/b/c.yaml'), path.join(root, 'a/b/c.yaml'));
});

test('resolveInside rejects parent traversal and absolute escapes', () => {
  const root = path.join(os.tmpdir(), 'hatm-root');
  assert.equal(resolveInside(root, '../secrets'), null);
  assert.equal(resolveInside(root, 'a/../../secrets'), null);
  assert.equal(resolveInside(root, '/etc/passwd'), null);
  assert.equal(resolveInside(root, '..'), null);
});

test('resolveInside rejects null bytes and empty input by default', () => {
  const root = path.join(os.tmpdir(), 'hatm-root');
  assert.equal(resolveInside(root, 'a\0b'), null);
  assert.equal(resolveInside(root, ''), null);
  assert.equal(resolveInside(root, '   '), null);
});

test('resolveInside can allow the root itself', () => {
  const root = path.join(os.tmpdir(), 'hatm-root');
  assert.equal(resolveInside(root, '', { allowRoot: true }), path.resolve(root));
  assert.equal(resolveInside(root, '.', { allowRoot: true }), path.resolve(root));
  assert.equal(resolveInside(root, ''), null);
});

test('isInside distinguishes root, child and sibling', () => {
  const root = path.join(os.tmpdir(), 'hatm-root');
  assert.equal(isInside(root, root), true);
  assert.equal(isInside(root, path.join(root, 'backup-1')), true);
  assert.equal(isInside(root, path.join(root, '..', 'other')), false);
  assert.equal(isInside(root, '/etc'), false);
});

test('realPathInside blocks a symlink that points outside the root', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'hatm-symlink-'));
  const root = path.join(base, 'root');
  const outside = path.join(base, 'outside');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'secret.txt'), 'secret');
  await fs.symlink(outside, path.join(root, 'escape'));

  assert.equal(await realPathInside(root, path.join(root, 'escape', 'secret.txt')), false);
  assert.equal(await realPathInside(root, path.join(root, 'missing.txt')), false);
});

test('realPathInsideParent checks the nearest existing ancestor', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'hatm-parent-'));
  const root = path.join(base, 'root');
  const outside = path.join(base, 'outside');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(root, 'escape'));

  // New nested file under a real directory is fine.
  assert.equal(await realPathInsideParent(root, path.join(root, 'a', 'b', 'c.yaml')), true);
  // New nested file under a symlinked directory is not.
  assert.equal(await realPathInsideParent(root, path.join(root, 'escape', 'new.yaml')), false);
  // Root itself must exist.
  assert.equal(await realPathInsideParent(path.join(base, 'nope'), path.join(base, 'nope', 'x')), false);
});
