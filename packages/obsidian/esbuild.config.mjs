import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

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
  },
  logLevel: 'info',
});
