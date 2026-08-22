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
run the interpretation. **Nothing else leaves your vault in this version** —
no vault files are read, no telemetry is collected. Vault-aware context is a
future, opt-in feature with a per-round disclosure log (see the Phase B spec).

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

P1 = the panel only, no vault reads. Coming per the Phase B spec:
context from your own notes (opt-in, folder allowlist, per-round
"what left your machine" log), session write-backs that wikilink to their
source notes (visible in the graph view), and a context-pack command for
carrying your context into any AI.
