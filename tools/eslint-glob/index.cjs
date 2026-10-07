// Next's lint plugin only uses globSync(pattern, { onlyDirectories: true }).
// Keep that contract without fast-glob's unpatched braces dependency.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Next loads this adapter synchronously through CommonJS.
const { globSync } = require("tinyglobby");

exports.globSync = (patterns, options = {}) =>
  globSync(patterns, {
    absolute: typeof patterns === "string" && /^(?:\/|[a-z]:[\\/])/i.test(patterns),
    ...options,
    expandDirectories: false,
  }).map((path) =>
    path.length > 1 && !/^[a-z]:\/$/i.test(path) ? path.replace(/\/$/, "") : path,
  );
