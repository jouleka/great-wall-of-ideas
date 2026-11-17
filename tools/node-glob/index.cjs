// Stand-in for the small fast-glob / tinyglobby surface our tooling uses:
//   - @next/eslint-plugin-next: fast-glob globSync(rootDir, { onlyDirectories })
//   - @typescript-eslint/typescript-estree, eslint-import-resolver-typescript:
//     tinyglobby globSync / isDynamicPattern
//   - @node-minify/utils (via @opennextjs/aws): fast-glob globSync /
//     convertPathToPattern
// Both upstream libraries depend on picomatch, which has an unpatched ReDoS
// advisory (GHSA-fc5q-39xc-vjpf). Node's built-in fs.globSync covers what these
// callers need without pulling picomatch into the tree.
// Known difference: Node's glob never matches dot-entries through wildcards,
// so `dot: true` is accepted but only explicit dot segments (e.g. `.next/**`)
// match hidden paths.
"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- loaded synchronously through CommonJS by fast-glob/tinyglobby consumers. */
const fs = require("node:fs");
const path = require("node:path");
/* eslint-enable @typescript-eslint/no-require-imports */

const toPosix = (value) => value.replace(/\\/g, "/");
const toList = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

function isDynamicPattern(pattern) {
  // Unescaped wildcard, character class, brace or extglob syntax.
  return /(^|[^\\])([*?[{]|[!+@]\()/.test(String(pattern));
}

function escapePath(value) {
  return toPosix(String(value)).replace(/([()[\]{}*?!@+|])/g, "\\$1");
}

function globSync(patterns, options = {}) {
  const list = toList(patterns).map((p) => toPosix(String(p)));
  if (list.length === 0) return [];

  const cwd = options.cwd ? path.resolve(String(options.cwd)) : process.cwd();
  const onlyDirectories = options.onlyDirectories === true;
  const onlyFiles = !onlyDirectories && options.onlyFiles !== false;
  const absolute =
    options.absolute === true || list.every((p) => path.isAbsolute(p) || /^[a-z]:\//i.test(p));
  const ignore = toList(options.ignore).map((p) => toPosix(String(p)));

  const results = new Set();
  for (const entry of fs.globSync(list, {
    cwd,
    withFileTypes: true,
    ...(ignore.length > 0 ? { exclude: ignore } : {}),
  })) {
    const isDirectory = entry.isDirectory() || (entry.isSymbolicLink() && isDirectoryTarget(entry, cwd));
    if (onlyDirectories && !isDirectory) continue;
    if (onlyFiles && isDirectory) continue;
    const full = path.resolve(cwd, entry.parentPath, entry.name);
    results.add(toPosix(absolute ? full : path.relative(cwd, full) || "."));
  }
  return [...results];
}

function isDirectoryTarget(entry, cwd) {
  try {
    return fs.statSync(path.resolve(cwd, entry.parentPath, entry.name)).isDirectory();
  } catch {
    return false;
  }
}

const glob = async (patterns, options) => globSync(patterns, options);

exports.globSync = globSync;
exports.sync = globSync;
exports.glob = glob;
exports.async = glob;
exports.isDynamicPattern = isDynamicPattern;
exports.escapePath = escapePath;
exports.convertPathToPattern = escapePath;
