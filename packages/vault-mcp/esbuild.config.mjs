import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync, chmodSync } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));

// Bundle the server to ONE self-contained file. @rpcs1/core is aliased to its
// SOURCE and bundled in (same pattern as the Obsidian plugin) because core is
// not published to npm — the published package must install cleanly with only
// its real registry deps (@modelcontextprotocol/sdk, zod), which stay external.
rmSync(path.join(here, 'dist'), { recursive: true, force: true });
await esbuild.build({
  entryPoints: [path.join(here, 'src/index.ts')],
  outfile: path.join(here, 'dist/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  external: ['@modelcontextprotocol/sdk', 'zod'],
  alias: {
    '@rpcs1/core': path.join(here, '../core/src/index.ts'),
  },
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
});
chmodSync(path.join(here, 'dist/index.js'), 0o755);
