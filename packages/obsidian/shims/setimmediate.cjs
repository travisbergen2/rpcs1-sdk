// Build-time shim (CommonJS on purpose: the package is "type": "module", and an ES-module
// shim's top-level module.exports would clobber the bundle's own exports), aliased over the `setimmediate` package by esbuild.
//
// JSZip's utils.delay() requires the `setimmediate` polyfill, which — like
// `immediate` — falls back to creating <script> elements on very old browsers.
// Obsidian's desktop runtime already has a native setImmediate; on mobile the
// polyfill would pick its postMessage path. This shim keeps the contract
// (a global setImmediate exists) with a plain setTimeout(0) and no DOM tricks,
// so the bundle contains no dynamic <script> creation.
if (typeof window.setImmediate !== 'function') {
  window.setImmediate = function setImmediate(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return window.setTimeout(function () {
      fn.apply(null, args);
    }, 0);
  };
}
