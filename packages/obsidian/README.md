# Explicit Formula — The Loop (Obsidian plugin)

Brain-dump what you want. See exactly what the AI heard. **Lock the lines it
got right — it redoes only the rest.** When it finally reads like your own
thought, copy the finished prompt into any AI, insert it into your note, or
answer it right in the panel.

Locked lines can never quietly change: they are enforced verbatim by a
mechanical check that runs **twice** — on the server and again inside this
plugin (`src/api.ts`). If anything upstream misbehaves, your locked lines are
put back and the panel tells you so.

## ⚠️ Network use (read this)

This plugin sends **the text you type into the loop panel** (your dump, and
the lines being re-derived) to the Explicit Formula service
(`https://www.explicitformula.com` by default, configurable in settings) to
run the interpretation. No telemetry is collected.

**Vault context is OFF by default.** If — and only if — you list folders in
Settings → "Folders the loop may read", the plugin selects up to 6 small
snippets (≤2400 characters total) from those folders to ground the
interpretation, chosen locally by a deterministic scorer (your words ×
your own note links × recency; nothing ships on link- or recency-proximity
alone). **Every round shows exactly what left your machine** — each note
name with its character count, inline above the lines. Empty the folder
list and vault reads stop entirely.

## Install (manual, pre-listing)

1. Build: `npm run build --workspace=packages/obsidian` (from the repo root)
2. Copy `manifest.json` and `main.js` into
   `<your vault>/.obsidian/plugins/explicit-formula-loop/`
3. Enable "Explicit Formula — The Loop" in Settings → Community plugins

Works on desktop and mobile (`isDesktopOnly: false`).

## Use

- Ribbon icon or command **"Open the Loop panel"**
- **"Start a loop from the selected text"** — your selection becomes the dump
- **"Start a loop from this note"** — the whole note becomes the dump
- Tap lines to lock them → **Redo the unlocked lines** → repeat →
  **It's right — finish it** → Copy / Insert into note / Answer it here

## Development

```
npm run test --workspace=packages/obsidian   # unit tests (API client, ratchet re-verify)
npm run lint --workspace=packages/obsidian   # tsc --noEmit
npm run build --workspace=packages/obsidian  # esbuild bundle -> main.js
```

The loop engine itself lives in `@rpcs1/core` (`packages/core/src/loop.ts`)
and is bundled into `main.js` at build time. A fixture vault for manual
testing is in `fixture-vault/`.

## Scope (P1) and what's next

## Import my AI history (P4)

Command palette → **"Import my AI history (ChatGPT / Claude)"** — a file
picker, zero terminal. Hand it whatever you have: the ChatGPT export zip,
Claude's `conversations-000.zip`, either vendor's `conversations.json`, or
Claude's `claude_data.json` manifest (the modal shows the manifest's
one-time download link to open in your own browser — this plugin never
fetches it; its network use stays explicitformula.com only).

The law, same as everywhere: every conversation's **full text lands in
`Private/Archive/<source>/`** — keep Private off your allowlist and no
connected AI can read any of it. Conversations matching research/build
vocabulary get a small **index stub** in `Notes/Archive index/` (title +
topic terms only, no content), plus an import report listing **possibly
forgotten threads** — research topics that appear rarely across your whole
history. Re-imports never overwrite: colliding names get suffixed.

## Wire the archive into topics (P5)

After importing, command palette → **Wire my archive into topics (graph
clusters)**. Each archive stub links to auto-generated `Notes/Topics/<term>`
hub notes, collapsing the disconnected import point-cloud into topic-centred
clusters in the graph view. Hubs are regenerable; each stub is linked once.

**Honest scope (pre-registered):** E-WIRE-1 tested whether this also improves
*retrieval* and the frozen grammar returned **FAIL** — hubs compete with
stubs for the 6-snippet search budget (reach improved when a hub surfaced,
but ranking displacement failed the null). So this ships as a **graph-
legibility feature, not a retrieval feature**. Making topics improve search
needs a reserved hub lane in the server (the E-WIRE-2 candidate), not this
wiring.

## Your graph shows the work (P3)

Finish a session and hit **Save to my vault**: the session lands as an
ordinary note (`Loop/<date> <slug>.md`) that **wikilinks every note that
grounded it** — open the graph view and each conversation appears wired
into the knowledge it drew from. `Loop/learnings.md` gains one line per
session (rounds, locked count, sources): fewer rounds over time means the
loop is starting closer to what you mean. Both write-backs have
off-switches; everything written is a visible, editable, deletable file.
**Copy my context pack** puts your recent loop history on the clipboard
to paste before a prompt in any AI.

Powered by [rpcs1.dev](https://rpcs1.dev) — the receiver engine behind
Explicit Formula.

P1 = the panel only, no vault reads. Coming per the Phase B spec:
context from your own notes (opt-in, folder allowlist, per-round
"what left your machine" log), session write-backs that wikilink to their
source notes (visible in the graph view), and a context-pack command for
carrying your context into any AI.
