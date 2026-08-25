# Explicit Formula — Second Brain (MCP server)

Your notes are your second brain. This connects it to **every AI you use** —
Claude Desktop, Claude Code, Cursor, and any other app that speaks MCP — so
the AI can search your own notes for context, cite them by name, and save new
notes back **into your graph**, wired to the notes they drew from.

It runs entirely on your machine. Nothing is hosted. Obsidian doesn't even
need to be open — the server reads the vault folder directly, so it also works
on any plain folder of markdown notes.

## ⚠️ What leaves your machine (read this)

Note content goes to exactly one place: **the AI app you connected this server
to** (which sends it to that app's model provider, as with anything you type
there). This server adds no other network use. No telemetry.

The same law as the Obsidian plugin, one switch:

- **Everything is OFF by default.** Until you list folders in the plugin's
  settings ("Folders the loop may read") or pass `--allow`, every tool refuses
  and nothing ships. The plugin's setting is read **live, on every call** —
  flip it in Obsidian and the server follows immediately, no restart.
- **Search is capped**: at most 6 snippets / 2400 characters per call, chosen
  by the same deterministic local scorer the plugin uses (your words × your
  own titles/headings × recency — nothing ships on recency alone).
- **Every result discloses itself**: each tool response lists exactly which
  note paths shipped and how many characters. The AI app shows tool results,
  so the disclosure travels with the data.
- **The vault keeps the receipts**: one line per call is appended to
  `Loop/mcp-audit.md` — a visible, editable, deletable note (`--no-audit`
  turns it off; the in-result disclosure never turns off).
- **Writes are fenced**: `save_to_second_brain` only creates new files inside
  your write-back folder (default `Loop/`). It can't overwrite, can't delete,
  can't touch any other path. Saved notes wikilink their sources, so they
  appear in your Obsidian graph connected to the knowledge they used.
- Hidden folders (`.obsidian`, `.git`, anything dot-prefixed) are never
  readable, even if allowlisted explicitly.

**What this can't protect against (honesty section):** once a snippet reaches
the AI app, its handling is governed by that app and its model provider, not
by us. And a note's *content* could try to talk the model into doing things —
treat that as the standing prompt-injection reality of every retrieval tool.
The fences above bound the blast radius (only allowlisted folders can be read
at all; writes land only in the write-back folder; the audit shows everything
that shipped), they don't abolish it.

## Setup

Requires Node 20+.

### Claude Desktop

Settings → Developer → Edit Config, add:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "npx",
      "args": ["-y", "second-brain-mcp", "--vault", "/absolute/path/to/YourVault"]
    }
  }
}
```

(Before the npm publish, or to run from a checkout: build with
`npm install && npm run build --workspace=packages/vault-mcp`, then use
`"command": "node", "args": ["/absolute/path/to/rpcs1-sdk/packages/vault-mcp/dist/index.js", "--vault", "..."]`.)

### Claude Code

```
claude mcp add second-brain -- npx -y second-brain-mcp --vault /absolute/path/to/YourVault
```

### Cursor (and most other MCP apps)

Add the same `command` + `args` pair in the app's MCP server settings. Any
client that supports **local (stdio) MCP servers** works. Remote-only clients
can't reach a local vault by design — for those, use the plugin's
**"Copy my context pack"** command instead.

## Options

| Flag | Meaning | Default |
| --- | --- | --- |
| `--vault <path>` | The Obsidian vault (or any folder of `.md` notes). Required. | — |
| `--allow "<a,b>"` | Override the folder allowlist. Normally omit: the plugin's setting is the single switch. | follow plugin settings; OFF if absent |
| `--write-folder <f>` | Where saved notes land. | plugin's write-back folder, else `Loop` |
| `--no-audit` | Don't keep `mcp-audit.md` in the vault. | audit on |

Precedence, per call: `--allow` > plugin settings (re-read live) > OFF.

## Tools

| Tool | Does | Fence |
| --- | --- | --- |
| `search_second_brain` | Deterministic snippet search over allowed folders | ≤6 snippets / ≤2400 chars per call, disclosure log in every result |
| `read_second_brain_note` | Read one note by path | allowlist-gated, ≤8000 chars per call (offset to continue) |
| `list_second_brain` | Browse available notes | metadata only (path, title, modified date) |
| `save_to_second_brain` | Save a new note that wikilinks its sources | write-back folder only, create-only |

A note on the search floor: the plugin requires score ≥ 2.5, calibrated with
graph proximity to the active note in the sum. An MCP session has no active
note (every candidate sits at graph score 0), so this server uses ≥ 2.0 — a
title/alias hit alone qualifies (the note is *named* for the query), while
bare recency or bare body echoes still never ship. Same law, restated for a
surface with one fewer signal.

## Development

```
npm run test --workspace=packages/vault-mcp    # unit tests (gates, caps, audit, write fences)
npm run lint --workspace=packages/vault-mcp    # tsc --noEmit (core resolved from source)
npm run build --workspace=packages/vault-mcp   # esbuild -> single-file dist/index.js
```

The build bundles `@rpcs1/core` from source into `dist/index.js` (the same
alias pattern as the Obsidian plugin), so the published npm package depends
only on `@modelcontextprotocol/sdk` and `zod`. `server.json` in this folder is
the MCP-registry metadata (validated against the 2025-12-11 schema).

Tests run against `tests/fixture-vault/` (copied to a temp dir when a test
writes). The selection scorer itself lives in `@rpcs1/core`
(`packages/core/src/vault-select.ts`) with its own tests — one canonical
implementation for the plugin and this server, so the privacy-relevant
behavior cannot drift between surfaces.

## Scope (v1)

In: search / read / list / fenced save, live plugin-settings pickup, audit.
Not in v1 (deliberate): arbitrary-path writes, deletes/renames, backlink and
graph queries, embedding search (the scorer stays deterministic and local —
no API keys), file watching. The graph layer the plugin already ships (P3
write-backs) is how MCP saves join the graph today.

Powered by [rpcs1.dev](https://rpcs1.dev) — the receiver engine behind
Explicit Formula.
