/**
 * /connect — single source of truth for the second-brain connect page.
 *
 * Everything the page renders about the second-brain server (package name,
 * released bundle, install links per AI app, the "start your brain" links,
 * and the privacy caps) lives here so it is unit-tested and drift-proof:
 * tests cross-check the package identity against packages/vault-mcp and the
 * search caps against @rpcs1/core's scorer.
 *
 * The link builders are isomorphic (browser + node): the page lets the user
 * type their notes folder once and every link/snippet re-renders with it.
 */

export const SECOND_BRAIN = {
  /** npm package (packages/vault-mcp). */
  npmPackage: '@travisbergen2/second-brain-mcp',
  npmVersion: '0.1.0',
  /** The key AI apps file this server under. */
  serverName: 'second-brain',
  /** Official MCP registry identifier. */
  registryName: 'io.github.travisbergen2/second-brain',
  /** Claude Desktop one-click add-on (GitHub release asset). */
  bundleVersion: '0.1.0',
  bundleTag: 'second-brain-mcpb-v0.1.0',
  bundleFile: 'second-brain-0.1.0.mcpb',
  bundleSizeLabel: '3.0 MB',
  bundleSha256: '5f1e4621f7f3bcbe229b7fd63ce22aa7405c1eeb2c4f534c35f708aaa025c094',
  /** The server file inside the bundle — byte-identical to the npm dist. */
  serverDistSha256: 'a50dc475c04c8cc387e5525a3010769be6a7a6c44d0877fc3cab0addfc85c163',
  repoUrl: 'https://github.com/travisbergen2/rpcs1-sdk',
} as const;

export const RELEASE_URL = `${SECOND_BRAIN.repoUrl}/releases/tag/${SECOND_BRAIN.bundleTag}`;
export const BUNDLE_URL = `${SECOND_BRAIN.repoUrl}/releases/download/${SECOND_BRAIN.bundleTag}/${SECOND_BRAIN.bundleFile}`;
export const SERVER_README_URL = `${SECOND_BRAIN.repoUrl}/tree/main/packages/vault-mcp#readme`;

/** What every search shares at most — mirrors the server's caps (tested against core). */
export const SHARE_CAPS = { snippets: 6, chars: 2400 } as const;

/** Shown wherever the user has not typed a folder yet. */
export const VAULT_PLACEHOLDER = '/path/to/your/notes';

export function normalizeVaultPath(input: string | null | undefined): string {
  const t = (input ?? '').trim();
  return t.length > 0 ? t : VAULT_PLACEHOLDER;
}

export interface McpServerConfig {
  command: 'npx';
  args: string[];
}

/** Arguments after `npx`: `-y <package> --vault <folder>` (the server requires --vault). */
export function serverArgs(vaultPath: string): string[] {
  return ['-y', SECOND_BRAIN.npmPackage, '--vault', normalizeVaultPath(vaultPath)];
}

export function mcpServerConfig(vaultPath: string): McpServerConfig {
  return { command: 'npx', args: serverArgs(vaultPath) };
}

/** The paste-in snippet shared by Windsurf, Gemini CLI, LM Studio, and Claude Desktop's manual route. */
export function mcpServersSnippet(vaultPath: string): string {
  return JSON.stringify(
    { mcpServers: { [SECOND_BRAIN.serverName]: mcpServerConfig(vaultPath) } },
    null,
    2,
  );
}

/**
 * Quote one shell argument when it needs it. Escapes only `"`, `$` and
 * backtick — never backslashes — so Windows paths survive PowerShell and
 * Unix paths survive bash inside double quotes.
 */
export function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_\-./:@~+=]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["$`])/g, '\\$1')}"`;
}

/** The Claude Code one-liner. */
export function claudeCodeCommand(vaultPath: string): string {
  return ['claude', 'mcp', 'add', SECOND_BRAIN.serverName, '--', 'npx', ...serverArgs(vaultPath)]
    .map(shellQuote)
    .join(' ');
}

/** UTF-8-safe base64 that works in browsers and Node alike (no Buffer). */
export function toBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64Utf8(b64: string): string {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export const CURSOR_DEEPLINK_BASE = 'cursor://anysphere.cursor-deeplink/mcp/install';

/**
 * Cursor's install deeplink: `?name=<server>&config=<base64 JSON>`. The
 * base64 is percent-encoded so `+`, `/` and `=` survive any query parser.
 */
export function cursorInstallLink(vaultPath: string): string {
  const config = toBase64Utf8(JSON.stringify(mcpServerConfig(vaultPath)));
  return `${CURSOR_DEEPLINK_BASE}?name=${SECOND_BRAIN.serverName}&config=${encodeURIComponent(config)}`;
}

export function parseCursorInstallLink(link: string): { name: string; config: McpServerConfig } {
  const url = new URL(link);
  const name = url.searchParams.get('name') ?? '';
  const config = JSON.parse(fromBase64Utf8(url.searchParams.get('config') ?? '')) as McpServerConfig;
  return { name, config };
}

export const VSCODE_INSTALL_BASE = 'vscode:mcp/install';

/** VS Code's install link: the whole query is one percent-encoded JSON object with the name inline. */
export function vscodeInstallLink(vaultPath: string): string {
  const obj = { name: SECOND_BRAIN.serverName, ...mcpServerConfig(vaultPath) };
  return `${VSCODE_INSTALL_BASE}?${encodeURIComponent(JSON.stringify(obj))}`;
}

export function parseVscodeInstallLink(link: string): { name: string } & McpServerConfig {
  return JSON.parse(decodeURIComponent(link.slice(link.indexOf('?') + 1)));
}

export type ClientTier = 'easiest' | 'coding' | 'terminal' | 'paste' | 'unsupported';

export interface ClientEntry {
  id: string;
  name: string;
  tier: ClientTier;
  /** Can this app run a local (stdio) server — i.e. reach files on the user's machine? */
  localSupported: boolean;
  /** One plain-language line. */
  how: string;
  /** Where the paste-in snippet goes (paste tier only). */
  configPath?: string;
  /** The official documentation the mechanism was verified against. */
  docs: string;
}

export const CLIENTS: ClientEntry[] = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    tier: 'easiest',
    localSupported: true,
    how: 'Download the add-on, double-click it, answer two questions.',
    docs: 'https://www.anthropic.com/engineering/desktop-extensions',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    tier: 'coding',
    localSupported: true,
    how: 'One click adds it; confirm your notes folder when asked.',
    docs: 'https://cursor.com/docs/mcp/install-links',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    tier: 'coding',
    localSupported: true,
    how: 'One click adds it; confirm your notes folder when asked.',
    docs: 'https://code.visualstudio.com/api/extension-guides/ai/mcp',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    tier: 'terminal',
    localSupported: true,
    how: 'Paste one line into the terminal.',
    docs: 'https://code.claude.com/docs/en/mcp-servers',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    tier: 'paste',
    localSupported: true,
    how: 'Paste the snippet into the settings file.',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    docs: 'https://docs.windsurf.com/windsurf/cascade/mcp',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    tier: 'paste',
    localSupported: true,
    how: 'Paste the snippet into the settings file.',
    configPath: '~/.gemini/settings.json',
    docs: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md',
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    tier: 'paste',
    localSupported: true,
    how: 'Paste the snippet into mcp.json (Program tab → Install → Edit mcp.json).',
    configPath: 'mcp.json (inside the app)',
    docs: 'https://lmstudio.ai/docs/app/mcp',
  },
  {
    id: 'claude-desktop-manual',
    name: 'Claude Desktop (manual way)',
    tier: 'paste',
    localSupported: true,
    how: 'Settings → Developer → Edit Config, paste the snippet.',
    configPath: 'claude_desktop_config.json',
    docs: 'https://modelcontextprotocol.io/docs/develop/connect-local-servers',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    tier: 'unsupported',
    localSupported: false,
    how: 'ChatGPT connects only to things on the internet, not to files on your computer.',
    docs: 'https://help.openai.com/en/articles/12584461',
  },
];

export interface StartLink {
  id: string;
  label: string;
  href: string;
  note: string;
}

/** Ways to get notes into a second brain — official downloads only. */
export const START_LINKS: StartLink[] = [
  {
    id: 'obsidian-desktop',
    label: 'Obsidian for Windows, Mac, or Linux',
    href: 'https://obsidian.md/download',
    note: 'The free notes app this pairs best with. It draws your notes as a map that grows as the AI saves notes back.',
  },
  {
    id: 'obsidian-android',
    label: 'Obsidian for Android',
    href: 'https://play.google.com/store/apps/details?id=md.obsidian',
    note: 'Use your phone’s Share button to send anything into your notes.',
  },
  {
    id: 'clipper-chrome',
    label: 'Web Clipper for Chrome',
    href: 'https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf',
    note: 'Turns the page you are reading into a note with one click.',
  },
  {
    id: 'clipper-firefox',
    label: 'Web Clipper for Firefox',
    href: 'https://addons.mozilla.org/en-US/firefox/addon/web-clipper-obsidian/',
    note: 'Same clipper, for Firefox.',
  },
  {
    id: 'importer',
    label: 'Importer — bring notes from Notion, Evernote, Google Keep, Word…',
    href: 'https://github.com/obsidianmd/obsidian-importer',
    note: 'The official importer moves your old notes in.',
  },
];

/** Hosts the start links may point at — a test enforces this allowlist. */
export const START_LINK_HOSTS = [
  'obsidian.md',
  'play.google.com',
  'chromewebstore.google.com',
  'addons.mozilla.org',
  'github.com',
];
