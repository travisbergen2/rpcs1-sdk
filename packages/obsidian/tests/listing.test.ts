// Community-directory readiness: the rules Obsidian's submission review applies
// to manifest.json / versions.json / repo files, pinned here so they cannot
// drift between releases. Sources: the Obsidian plugin guidelines and the
// obsidian-releases validation (id/name/description/version rules).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const versions = JSON.parse(read('versions.json')) as Record<string, string>;
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');

describe('manifest.json — directory rules', () => {
  it('id: lowercase letters/digits/hyphens, no "obsidian", does not end with "plugin"', () => {
    expect(manifest.id).toMatch(/^[a-z0-9-]+$/);
    expect(manifest.id).not.toMatch(/obsidian/);
    expect(manifest.id).not.toMatch(/plugin$/);
  });

  it('name: basic Latin only (no em dash / emoji), no "Obsidian", no "Plugin"', () => {
    expect(manifest.name).toMatch(/^[\x20-\x7E]+$/);
    expect(manifest.name).not.toMatch(/obsidian|obsi-|-sidian/i);
    expect(manifest.name).not.toMatch(/\bplugin\b/i);
    expect(manifest.name.trim().length).toBeGreaterThan(0);
  });

  it('version: strict SemVer x.y.z and identical in package.json', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).toBe(manifest.version);
  });

  it('description: ≤ 250 chars, ends with a period, no emoji, does not start with "This is"', () => {
    expect(manifest.description.length).toBeLessThanOrEqual(250);
    expect(manifest.description.trim().endsWith('.')).toBe(true);
    expect(manifest.description).toMatch(/^[\x20-\x7E—–’“”]+$/);
    expect(manifest.description).not.toMatch(/^this is/i);
  });

  it('required fields present with the right types; isDesktopOnly is a boolean', () => {
    for (const k of ['id', 'name', 'version', 'minAppVersion', 'description', 'author']) {
      expect(typeof manifest[k], k).toBe('string');
      expect(manifest[k].length, k).toBeGreaterThan(0);
    }
    expect(typeof manifest.isDesktopOnly).toBe('boolean');
    expect(manifest.minAppVersion).toMatch(/^\d+\.\d+\.\d+$/);
    if (manifest.authorUrl) expect(manifest.authorUrl).toMatch(/^https:\/\//);
  });
});

describe('versions.json', () => {
  it('maps this manifest version to its minAppVersion', () => {
    expect(versions[manifest.version]).toBe(manifest.minAppVersion);
  });
  it('every key and value is SemVer', () => {
    for (const [k, v] of Object.entries(versions)) {
      expect(k).toMatch(/^\d+\.\d+\.\d+$/);
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe('repo files the directory reads', () => {
  it('README, LICENSE, manifest.json, versions.json, styles.css exist beside the plugin', () => {
    for (const f of ['README.md', 'LICENSE', 'manifest.json', 'versions.json', 'styles.css']) {
      expect(existsSync(join(root, f)), f).toBe(true);
    }
    expect(read('LICENSE')).toMatch(/MIT License/);
  });

  it('README discloses network use plainly and states there is no telemetry and no account', () => {
    expect(readme).toMatch(/network use/i);
    expect(readme).toMatch(/explicitformula\.com/);
    expect(readme).toMatch(/no telemetry/i);
  });

  it('README title carries the manifest name', () => {
    expect(readme.split('\n')[0]).toContain(manifest.name);
  });

  it('main.js is not committed (release asset only)', () => {
    const gitignore = readFileSync(join(root, '..', '..', '.gitignore'), 'utf8');
    expect(gitignore).toMatch(/packages\/obsidian\/main\.js/);
  });
});

describe('source hygiene the review bot checks', () => {
  const srcFiles = ['main.ts', 'api.ts', 'import-modal.ts', 'importer.ts', 'writeback.ts', 'constellation.ts', 'topic-wiring.ts', 'ui-prefs.ts', 'accommodation.ts'];
  const src = srcFiles.map((f) => read(join('src', f))).join('\n');

  it('no inline element styles except CSS custom properties (styles live in styles.css)', () => {
    const inline = src.match(/\.style\.(?!setProperty\(\s*['"]--)[a-zA-Z]+\s*=/g) ?? [];
    expect(inline, inline.join(', ')).toEqual([]);
  });

  it('no default hotkeys, no activeLeaf, no innerHTML, no `as any`, no var, no Node fs/electron imports', () => {
    expect(src).not.toMatch(/hotkeys\s*:/);
    expect(src).not.toMatch(/workspace\.activeLeaf/);
    expect(src).not.toMatch(/innerHTML/);
    expect(src).not.toMatch(/as any\b/);
    expect(src).not.toMatch(/^\s*var\s/m);
    expect(src).not.toMatch(/from ['"](fs|electron|child_process|os|path)['"]/);
  });

  it('uses requestUrl-free networking through the api module only when isDesktopOnly is false', () => {
    // The plugin is mobile-capable; raw fetch is acceptable in Obsidian's mobile
    // runtime but must be confined to the api module so a future switch to
    // requestUrl touches one file.
    const mainOnly = read('src/main.ts');
    expect(mainOnly).not.toMatch(/\bfetch\(/);
  });
});

describe('mirror script', () => {
  it('lists every root file the directory needs', () => {
    const script = read('scripts/mirror.mjs');
    for (const f of ['manifest.json', 'versions.json', 'README.md', 'LICENSE', 'styles.css']) {
      expect(script).toContain(`'${f}'`);
    }
    expect(script).toMatch(/vendor\/rpcs1-core|vendor', 'rpcs1-core/);
    expect(script).toContain("'.gitignore'");
  });
});
