import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCliArgs,
  parseFolderList,
  readPluginSettings,
  effectiveConfig,
  ConfigError,
  PLUGIN_ID,
} from '../src/config.js';

const FIXTURE = fileURLToPath(new URL('./fixture-vault', import.meta.url));

function tmpVaultCopy(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'vault-mcp-'));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

describe('parseFolderList (mirrors the plugin parse)', () => {
  it('splits, trims, drops empties', () => {
    expect(parseFolderList('notes, projects')).toEqual(['notes', 'projects']);
    expect(parseFolderList('  a ,, b/c ,')).toEqual(['a', 'b/c']);
    expect(parseFolderList('')).toEqual([]);
    expect(parseFolderList(' , ')).toEqual([]);
  });
});

describe('parseCliArgs', () => {
  it('requires --vault', () => {
    expect(() => parseCliArgs([])).toThrow(ConfigError);
  });
  it('rejects a nonexistent vault', () => {
    expect(() => parseCliArgs(['--vault', '/definitely/not/a/real/path'])).toThrow(ConfigError);
  });
  it('rejects unknown options', () => {
    expect(() => parseCliArgs(['--vault', FIXTURE, '--frobnicate'])).toThrow(ConfigError);
  });
  it('parses the full option set', () => {
    const cli = parseCliArgs([
      '--vault', FIXTURE,
      '--allow', 'notes, projects',
      '--write-folder', 'Inbox',
      '--no-audit',
    ]);
    expect(cli.vaultPath.endsWith('fixture-vault')).toBe(true);
    expect(cli.allowOverride).toEqual(['notes', 'projects']);
    expect(cli.writeFolderOverride).toBe('Inbox');
    expect(cli.auditEnabled).toBe(false);
  });
  it('defaults: no override, audit on', () => {
    const cli = parseCliArgs(['--vault', FIXTURE]);
    expect(cli.allowOverride).toBeNull();
    expect(cli.writeFolderOverride).toBeNull();
    expect(cli.auditEnabled).toBe(true);
  });
});

describe('readPluginSettings', () => {
  it('reads the fixture plugin settings', () => {
    const s = readPluginSettings(FIXTURE);
    expect(s).not.toBeNull();
    expect(s!.allowedFolders).toEqual(['notes', 'projects']);
    expect(s!.writeBackFolder).toBe('Loop');
  });
  it('returns null when the plugin is not installed', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vault-mcp-empty-'));
    expect(readPluginSettings(dir)).toBeNull();
  });
  it('returns null on malformed JSON (tolerant, never throws)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vault-mcp-bad-'));
    const pdir = path.join(dir, '.obsidian', 'plugins', PLUGIN_ID);
    mkdirSync(pdir, { recursive: true });
    writeFileSync(path.join(pdir, 'data.json'), '{not json');
    expect(readPluginSettings(dir)).toBeNull();
  });
});

describe('effectiveConfig precedence', () => {
  it('plugin settings apply when no CLI override', () => {
    const cli = parseCliArgs(['--vault', FIXTURE]);
    const cfg = effectiveConfig(cli);
    expect(cfg.allowedFolders).toEqual(['notes', 'projects']);
    expect(cfg.writeBackFolder).toBe('Loop');
    expect(cfg.allowlistSource).toBe('plugin-settings');
  });
  it('CLI --allow overrides plugin settings', () => {
    const cli = parseCliArgs(['--vault', FIXTURE, '--allow', 'notes']);
    const cfg = effectiveConfig(cli);
    expect(cfg.allowedFolders).toEqual(['notes']);
    expect(cfg.allowlistSource).toBe('cli');
  });
  it('no plugin, no CLI → OFF (privacy law 3)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vault-mcp-off-'));
    const cli = parseCliArgs(['--vault', dir]);
    const cfg = effectiveConfig(cli);
    expect(cfg.allowedFolders).toEqual([]);
    expect(cfg.allowlistSource).toBe('off');
    expect(cfg.writeBackFolder).toBe('Loop');
  });
  it('re-reads plugin settings live (edit applies without restart)', () => {
    const dir = tmpVaultCopy();
    const cli = parseCliArgs(['--vault', dir]);
    expect(effectiveConfig(cli).allowedFolders).toEqual(['notes', 'projects']);
    const dataFile = path.join(dir, '.obsidian', 'plugins', PLUGIN_ID, 'data.json');
    writeFileSync(dataFile, JSON.stringify({ allowedFolders: 'notes', writeBackFolder: 'Loop' }));
    expect(effectiveConfig(cli).allowedFolders).toEqual(['notes']);
    writeFileSync(dataFile, JSON.stringify({ allowedFolders: '', writeBackFolder: 'Loop' }));
    const off = effectiveConfig(cli);
    expect(off.allowedFolders).toEqual([]);
    expect(off.allowlistSource).toBe('off');
  });
});
