import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SELECT_CAPS } from '@rpcs1/core';
import {
  BUNDLE_URL,
  CLIENTS,
  RELEASE_URL,
  SECOND_BRAIN,
  SHARE_CAPS,
  START_LINKS,
  START_LINK_HOSTS,
  VAULT_PLACEHOLDER,
  claudeCodeCommand,
  cursorInstallLink,
  fromBase64Utf8,
  mcpServersSnippet,
  normalizeVaultPath,
  parseCursorInstallLink,
  parseVscodeInstallLink,
  shellQuote,
  toBase64Utf8,
  vscodeInstallLink,
} from '../lib/connect';
import { LABS } from '../lib/labs';
import sitemap from '../app/sitemap';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

const PATHS = [
  '/Users/travis/Notes',
  'C:\\Users\\travis\\Documents\\My Notes',
  '/home/ünïcode/Zettelkasten',
  '~/notes with spaces/vault',
];

describe('second-brain identity — drift-proof against packages/vault-mcp', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'vault-mcp', 'package.json'), 'utf8'));

  it('names the same npm package and version the server publishes', () => {
    expect(SECOND_BRAIN.npmPackage).toBe(pkg.name);
    expect(SECOND_BRAIN.npmVersion).toBe(pkg.version);
    expect(SECOND_BRAIN.registryName).toBe(pkg.mcpName);
  });

  it('bundle URLs are derived from the tag and file, on the repo', () => {
    expect(BUNDLE_URL).toBe(
      `https://github.com/travisbergen2/rpcs1-sdk/releases/download/${SECOND_BRAIN.bundleTag}/${SECOND_BRAIN.bundleFile}`,
    );
    expect(RELEASE_URL).toBe(`https://github.com/travisbergen2/rpcs1-sdk/releases/tag/${SECOND_BRAIN.bundleTag}`);
    expect(SECOND_BRAIN.bundleFile).toContain(SECOND_BRAIN.bundleVersion);
    expect(SECOND_BRAIN.bundleTag).toContain(SECOND_BRAIN.bundleVersion);
  });

  it('records real sha256 digests (64 hex chars) for the bundle and the server file', () => {
    expect(SECOND_BRAIN.bundleSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(SECOND_BRAIN.serverDistSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('privacy caps on the page equal the scorer caps in @rpcs1/core', () => {
    expect(SHARE_CAPS.snippets).toBe(SELECT_CAPS.maxSnippets);
    expect(SHARE_CAPS.chars).toBe(SELECT_CAPS.maxTotalChars);
  });
});

describe('link builders — every path round-trips exactly', () => {
  it('normalizes an empty folder to the visible placeholder', () => {
    expect(normalizeVaultPath('')).toBe(VAULT_PLACEHOLDER);
    expect(normalizeVaultPath('   ')).toBe(VAULT_PLACEHOLDER);
    expect(normalizeVaultPath(undefined)).toBe(VAULT_PLACEHOLDER);
    expect(normalizeVaultPath('  /x/y ')).toBe('/x/y');
  });

  it('base64 helpers are UTF-8 safe and invertible', () => {
    for (const s of ['plain', 'ünïcode → ✓', '{"a":"C:\\\\x"}']) {
      expect(fromBase64Utf8(toBase64Utf8(s))).toBe(s);
    }
    // Matches Node's canonical encoding for ASCII input.
    expect(toBase64Utf8('hello')).toBe(Buffer.from('hello').toString('base64'));
  });

  it.each(PATHS)('Cursor deeplink carries the exact config for %s', (p) => {
    const link = cursorInstallLink(p);
    expect(link.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?name=second-brain&config=')).toBe(true);
    const { name, config } = parseCursorInstallLink(link);
    expect(name).toBe('second-brain');
    expect(config).toEqual({ command: 'npx', args: ['-y', SECOND_BRAIN.npmPackage, '--vault', p] });
  });

  it('Cursor config is percent-encoded so base64 symbols survive query parsing', () => {
    const link = cursorInstallLink('/a+b/c=d');
    const raw = link.slice(link.indexOf('config=') + 'config='.length);
    expect(raw).not.toMatch(/[+/=]/); // only %XX escapes remain
    expect(parseCursorInstallLink(link).config.args[3]).toBe('/a+b/c=d');
  });

  it.each(PATHS)('VS Code install link carries name + exact config for %s', (p) => {
    const link = vscodeInstallLink(p);
    expect(link.startsWith('vscode:mcp/install?')).toBe(true);
    expect(parseVscodeInstallLink(link)).toEqual({
      name: 'second-brain',
      command: 'npx',
      args: ['-y', SECOND_BRAIN.npmPackage, '--vault', p],
    });
  });

  it.each(PATHS)('paste-in snippet is valid JSON with --vault for %s', (p) => {
    const parsed = JSON.parse(mcpServersSnippet(p));
    expect(parsed.mcpServers['second-brain']).toEqual({
      command: 'npx',
      args: ['-y', SECOND_BRAIN.npmPackage, '--vault', p],
    });
  });

  it('Claude Code one-liner quotes only what needs quoting', () => {
    expect(claudeCodeCommand('/Users/t/Notes')).toBe(
      `claude mcp add second-brain -- npx -y ${SECOND_BRAIN.npmPackage} --vault /Users/t/Notes`,
    );
    expect(claudeCodeCommand('/Users/t/My Notes')).toBe(
      `claude mcp add second-brain -- npx -y ${SECOND_BRAIN.npmPackage} --vault "/Users/t/My Notes"`,
    );
    // Windows paths keep their backslashes intact (PowerShell-safe).
    expect(claudeCodeCommand('C:\\Users\\t\\My Notes')).toContain('"C:\\Users\\t\\My Notes"');
    expect(shellQuote('has"quote')).toBe('"has\\"quote"');
    expect(shellQuote('$HOME/x y')).toBe('"\\$HOME/x y"');
  });

  it('with no folder typed, every output shows the placeholder to replace', () => {
    expect(claudeCodeCommand('')).toContain(VAULT_PLACEHOLDER);
    expect(mcpServersSnippet('')).toContain(VAULT_PLACEHOLDER);
    expect(parseCursorInstallLink(cursorInstallLink('')).config.args[3]).toBe(VAULT_PLACEHOLDER);
    expect(parseVscodeInstallLink(vscodeInstallLink('')).args[3]).toBe(VAULT_PLACEHOLDER);
  });
});

describe('client inventory — honest per app', () => {
  it('ids are unique and every docs link is https', () => {
    const ids = CLIENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CLIENTS) expect(c.docs.startsWith('https://')).toBe(true);
  });

  it('ChatGPT is marked remote-only — never promised a local connection', () => {
    const chatgpt = CLIENTS.find((c) => c.id === 'chatgpt');
    expect(chatgpt?.localSupported).toBe(false);
    expect(chatgpt?.tier).toBe('unsupported');
  });

  it('exactly one easiest path, and it is the no-install bundle', () => {
    const easiest = CLIENTS.filter((c) => c.tier === 'easiest');
    expect(easiest).toHaveLength(1);
    expect(easiest[0].id).toBe('claude-desktop');
    expect(easiest[0].localSupported).toBe(true);
  });

  it('every paste-tier client says where the snippet goes', () => {
    for (const c of CLIENTS.filter((c) => c.tier === 'paste')) {
      expect(c.configPath, c.id).toBeTruthy();
    }
  });

  it('unsupported clients are the only ones without local support', () => {
    for (const c of CLIENTS) {
      expect(c.localSupported, c.id).toBe(c.tier !== 'unsupported');
    }
  });
});

describe('start links — official sources only', () => {
  it('all https, hosts within the allowlist, ids unique', () => {
    const ids = START_LINKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of START_LINKS) {
      const u = new URL(l.href);
      expect(u.protocol, l.id).toBe('https:');
      expect(START_LINK_HOSTS, `${l.id}: ${u.hostname}`).toContain(u.hostname);
      expect(l.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('/connect — wired into the site', () => {
  const page = read('app/connect/page.tsx');

  it('consumer register: no mechanism vocabulary in the page copy (same ratchet as pricing)', () => {
    const MECHANISM = /RPCS-1|\bTI\b|\bSG\b|\bFT\b|\bUE\b|\bAR\b|\bMCP\b|CUSUM|receiver primitive/;
    expect(page).not.toMatch(MECHANISM);
  });

  it('the download button points at the released bundle and the page states what leaves the machine', () => {
    expect(page).toContain('BUNDLE_URL');
    expect(page).toMatch(/leaves your computer/i);
    expect(page).toMatch(/OFF/);
  });

  it('is reachable from the homepage, Labs, the footer, the docs index, and the sitemap', () => {
    expect(read('app/page.tsx')).toContain('href="/connect"');
    expect(read('components/Footer.tsx')).toContain('href="/connect"');
    expect(read('app/docs/page.tsx')).toContain('href="/connect"');
    expect(LABS.some((l) => l.href === '/connect')).toBe(true);
    expect(sitemap().map((e) => e.url)).toContain('https://rpcs1.dev/connect');
  });
});
