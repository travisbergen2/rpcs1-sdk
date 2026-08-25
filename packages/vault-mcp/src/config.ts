// ── Config resolution: one privacy switch ─────────────────────────────────────
//
// The allowlist has exactly one primary home: the Obsidian plugin's settings
// file (data.json inside the vault). The server re-reads that file on EVERY
// tool call, so flipping the switch in Obsidian's settings takes effect
// immediately — no server restart, no second switch to forget. CLI --allow is
// an explicit per-client override and wins when present. Neither present =
// vault reads OFF, identical to the plugin's default (privacy law 3: empty
// allowlist means nothing ships).

import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

/** The Obsidian plugin whose settings this server treats as canonical. */
export const PLUGIN_ID = 'explicit-formula-loop';

export const DEFAULT_WRITEBACK_FOLDER = 'Loop';

export interface CliOptions {
  /** Absolute, realpath'd vault root. */
  vaultPath: string;
  /** null = defer to plugin settings (the normal case). */
  allowOverride: string[] | null;
  /** null = defer to plugin settings, then DEFAULT_WRITEBACK_FOLDER. */
  writeFolderOverride: string | null;
  /** Vault-side access log (mcp-audit.md). Default ON. */
  auditEnabled: boolean;
}

export interface EffectiveConfig {
  allowedFolders: string[];
  writeBackFolder: string;
  /** Where the allowlist came from — reported in tool results for honesty. */
  allowlistSource: 'cli' | 'plugin-settings' | 'off';
}

export class ConfigError extends Error {}

/** Mirror of the plugin's parse (main.ts allowedFolders()): split, trim, drop empties. */
export function parseFolderList(s: string): string[] {
  return s
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
}

export const USAGE = [
  'Usage: second-brain-mcp --vault <path-to-vault-or-notes-folder> [options]',
  '',
  'Options:',
  '  --vault <path>       REQUIRED. The Obsidian vault (or any folder of .md notes).',
  '  --allow "<a,b>"      Override the folder allowlist (comma-separated, relative to',
  '                       the vault). Normally omit this: the server follows the',
  '                       Explicit Formula plugin\'s "Folders the loop may read"',
  '                       setting, live. No plugin settings and no --allow = all',
  '                       reads are OFF.',
  '  --write-folder <f>   Folder for notes saved by AI apps (default: the plugin\'s',
  '                       write-back folder, else "Loop").',
  '  --no-audit           Do not keep the mcp-audit.md access log in the vault.',
].join('\n');

/** Parse argv (the part after the script path). Throws ConfigError with a friendly message. */
export function parseCliArgs(argv: string[]): CliOptions {
  let vault: string | null = null;
  let allowOverride: string[] | null = null;
  let writeFolderOverride: string | null = null;
  let auditEnabled = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--vault') {
      vault = argv[++i] ?? null;
    } else if (arg === '--allow') {
      const v = argv[++i];
      if (v === undefined) throw new ConfigError('--allow requires a value.\n\n' + USAGE);
      allowOverride = parseFolderList(v);
    } else if (arg === '--write-folder') {
      const v = argv[++i];
      if (v === undefined) throw new ConfigError('--write-folder requires a value.\n\n' + USAGE);
      writeFolderOverride = v.trim();
    } else if (arg === '--no-audit') {
      auditEnabled = false;
    } else {
      throw new ConfigError(`Unknown option: ${arg}\n\n${USAGE}`);
    }
  }

  if (!vault) throw new ConfigError('Missing required --vault <path>.\n\n' + USAGE);

  let real: string;
  try {
    real = realpathSync(path.resolve(vault));
  } catch {
    throw new ConfigError(`Vault path does not exist: ${vault}`);
  }
  if (!statSync(real).isDirectory()) {
    throw new ConfigError(`Vault path is not a folder: ${vault}`);
  }

  return { vaultPath: real, allowOverride, writeFolderOverride, auditEnabled };
}

export interface PluginSettingsSlice {
  allowedFolders?: string[];
  writeBackFolder?: string;
}

/**
 * Read the Explicit Formula plugin's settings from the vault. Tolerant: a
 * missing or malformed file returns null (the plugin may simply not be
 * installed — the CLI --allow path covers plain markdown folders).
 */
export function readPluginSettings(vaultPath: string): PluginSettingsSlice | null {
  const file = path.join(vaultPath, '.obsidian', 'plugins', PLUGIN_ID, 'data.json');
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: PluginSettingsSlice = {};
    if (typeof data.allowedFolders === 'string') {
      out.allowedFolders = parseFolderList(data.allowedFolders);
    }
    if (typeof data.writeBackFolder === 'string' && data.writeBackFolder.trim()) {
      out.writeBackFolder = data.writeBackFolder.trim();
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Resolve the effective config for ONE tool call. Called per-call by design:
 * the plugin settings file is re-read every time so allowlist edits in
 * Obsidian apply live. Precedence: CLI override > plugin settings > OFF.
 */
export function effectiveConfig(cli: CliOptions): EffectiveConfig {
  const plugin = readPluginSettings(cli.vaultPath);

  let allowedFolders: string[];
  let allowlistSource: EffectiveConfig['allowlistSource'];
  if (cli.allowOverride !== null) {
    allowedFolders = cli.allowOverride;
    allowlistSource = allowedFolders.length > 0 ? 'cli' : 'off';
  } else if (plugin?.allowedFolders && plugin.allowedFolders.length > 0) {
    allowedFolders = plugin.allowedFolders;
    allowlistSource = 'plugin-settings';
  } else {
    allowedFolders = [];
    allowlistSource = 'off';
  }

  const writeBackFolder =
    cli.writeFolderOverride ?? plugin?.writeBackFolder ?? DEFAULT_WRITEBACK_FOLDER;

  return { allowedFolders, writeBackFolder, allowlistSource };
}
