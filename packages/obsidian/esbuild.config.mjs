import esbuild from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Bundle the plugin. @rpcs1/core is aliased to its SOURCE so the ratchet
// engine ships inside main.js (an Obsidian plugin cannot resolve workspace
// packages at runtime). "obsidian" stays external — the app provides it.
await esbuild.build({
  entryPoints: [path.join(here, 'src/main.ts')],
  outfile: path.join(here, 'main.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: ['obsidian', 'electron', '@codemirror/*'],
  alias: {
    '@rpcs1/core': path.join(here, '../core/src/index.ts'),
    // JSZip's package entry for browsers is a pre-bundled dist file with its
    // Promise/setImmediate polyfills inlined — polyfills that create <script>
    // elements on ancient browsers, which the directory's obfuscation scan
    // flags. Bundle JSZip from its CommonJS sources instead so the two
    // polyfill requires are visible, then substitute native replacements
    // (see shims/*.cjs).
    jszip: require.resolve('jszip/lib/index.js'),
    lie: path.join(here, 'shims/lie.cjs'),
    setimmediate: path.join(here, 'shims/setimmediate.cjs'),
    // JSZip's browser entry expects a bundler-supplied Node stream shim; the
    // plugin never uses JSZip's stream features, so hand it an empty module.
    stream: path.join(here, 'shims/stream.cjs'),
    'readable-stream': path.join(here, 'shims/stream.cjs'),
  },
  logLevel: 'info',
});
