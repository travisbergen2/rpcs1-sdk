// Build-time shim (CommonJS on purpose: the package is "type": "module", and an ES-module
// shim's top-level module.exports would clobber the bundle's own exports), aliased over the `lie` package by esbuild.
//
// JSZip depends on `lie` (a Promise polyfill) whose own dependency `immediate`
// carries an old-Internet-Explorer setImmediate fallback that creates <script>
// elements at runtime. Every platform Obsidian runs on has native Promises, so
// the polyfill is dead weight — and the community directory's obfuscation scan
// (rightly) flags dynamic <script> creation in the bundle. The alias hands
// JSZip the native Promise instead. (jszip/lib/external.js already prefers the
// global Promise when present; this only removes the unreachable fallback.)
module.exports = Promise;
