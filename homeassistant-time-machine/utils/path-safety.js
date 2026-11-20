const path = require('path');
const fs = require('fs').promises;

/**
 * Resolve a user-supplied path underneath a fixed root directory.
 *
 * Returns the absolute path when it stays inside the root, or null when the
 * input is missing, contains a null byte, or escapes the root. When
 * options.allowRoot is true, the root itself is accepted too.
 *
 * This is a lexical check only. Use realPathInside() or
 * realPathInsideParent() when a symlink could point somewhere else.
 *
 * @param {string} root Directory the result must stay inside.
 * @param {string} userPath Path supplied by the caller, absolute or relative.
 * @param {{ allowRoot?: boolean }} [options] Set allowRoot to accept root itself.
 * @returns {string|null} Absolute path, or null when the path is not allowed.
 */
function resolveInside(root, userPath, options = {}) {
  const { allowRoot = false } = options;

  if (typeof root !== 'string' || typeof userPath !== 'string') return null;
  if (root.includes('\0') || userPath.includes('\0')) return null;

  const trimmed = userPath.trim();
  if (!trimmed && !allowRoot) return null;

  const base = path.resolve(root);
  const target = path.resolve(base, trimmed);
  const relative = path.relative(base, target);

  if (relative === '') {
    return allowRoot ? target : null;
  }

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }

  return target;
}

/**
 * True when target is root itself or sits underneath root.
 * Lexical only, so callers that touch the filesystem should pair this with a
 * real-path check.
 *
 * @param {string} root Directory the target must stay inside.
 * @param {string} target Path to test.
 * @returns {boolean}
 */
function isInside(root, target) {
  if (typeof root !== 'string' || typeof target !== 'string') return false;
  if (root.includes('\0') || target.includes('\0')) return false;

  const base = path.resolve(root);
  const absolute = path.resolve(target);
  const relative = path.relative(base, absolute);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Follow symlinks for an existing path and check that the real target stays
 * inside the real root. Returns false when either path cannot be resolved.
 *
 * @param {string} root Directory the target must stay inside.
 * @param {string} target Existing path to check.
 * @returns {Promise<boolean>}
 */
async function realPathInside(root, target) {
  try {
    const realRoot = await fs.realpath(root);
    const realTarget = await fs.realpath(target);
    return isInside(realRoot, realTarget);
  } catch {
    return false;
  }
}

/**
 * Follow symlinks for the nearest existing ancestor of a path that may not
 * exist yet. This catches a symlinked directory in the middle of the path
 * before a caller creates files underneath it.
 *
 * @param {string} root Directory the target must stay inside.
 * @param {string} target Path that may be created later.
 * @returns {Promise<boolean>}
 */
async function realPathInsideParent(root, target) {
  try {
    const realRoot = await fs.realpath(root);
    let ancestor = path.dirname(path.resolve(target));

    while (true) {
      try {
        const realAncestor = await fs.realpath(ancestor);
        return isInside(realRoot, realAncestor);
      } catch (error) {
        if (error.code !== 'ENOENT') return false;
        const parent = path.dirname(ancestor);
        if (parent === ancestor) return false;
        ancestor = parent;
      }
    }
  } catch {
    return false;
  }
}

module.exports = {
  resolveInside,
  isInside,
  realPathInside,
  realPathInsideParent,
};
