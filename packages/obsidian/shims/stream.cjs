// Build-time shim, aliased over Node's `stream` (and the `readable-stream` package)
// by esbuild. CommonJS on purpose: the package is "type": "module", and an
// ES-module shim's top-level module.exports would clobber the bundle's own exports.
//
// JSZip's browser entry expects the bundler to supply a Node-style stream
// implementation — browserify does, esbuild does not. The plugin never uses
// JSZip's stream features (it loads a zip from an ArrayBuffer and reads
// entries as strings), and JSZip probes for streams defensively:
// `support.nodestream = !!require("readable-stream").Readable` inside a
// try/catch, with every stream adapter loaded only when that is true. An
// empty module therefore switches the stream features off cleanly — and keeps
// a second stream implementation (plus Buffer/process polyfills) out of the
// bundle.
module.exports = {};
