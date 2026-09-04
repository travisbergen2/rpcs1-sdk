# Explicit Formula — web app (`packages/web`)

Next.js app serving explicitformula.com (and rpcs1.dev, the mechanism home):
the `/loop` capture surface, the translator/tuner APIs, docs, and billing.

## The homepage is the instrument (2026-09-04)

`app/page.tsx` renders `components/Instrument.tsx` and a three-link row —
nothing else. No beats, no pitch sections, no offer copy on the face
(`tests/instrument.test.ts` ratchets this at the source level). Organizations
still reach licensing through the site-wide nav and footer.

**Two panes.** Left — *You*: the words as typed, with the deterministic fork
squiggles from `mirror()` (tap a squiggle or a chip to lock a reading; the
clarifier is appended exactly as on `/send`). Right — *What the model hears*:
the message as core's `interpret()` parses it (unresolved referents
bracketed), the questions the model would need answered, whether it should
check its reading first, the **standing instruction built from the dials**,
and a collapsible "exact text that will be sent" preview that is byte-for-
byte the hand-off payload.

**Five dials = the receiver profile R̂.** One slider per primitive, 0–100:
Pace (TI), Tone (SG), Directness (FT), Flexibility (UE), Ambiguity (AR) — the
same human-side names core's profile card uses. They read and write
`localStorage['rpcs1.rhat.v1']`, the key `/calibrate` writes and the Bridge
return leg reads, so a calibration and a slider move are the same object
(`lib/rhat-store.ts`, `useSyncExternalStore`, server renders neutral 50s).

**The equation is literal.** `lib/instrument.ts` derives every displayed
string from `@rpcs1/core`'s own functions: the instruction paragraph is
`directivesToInstructions(deriveRenderingDirectives(R̂))` — identical to
`rewriteForProfile(...).rewrite_instructions`; the per-dial trace lines are
core's `why` strings; "Show the math" prints `mapToParameters(R̂, 'generic')`
and `evaluateRegime(R̂)` with the rule stated next to each value. The test
suite pins the instruction equality on a grid and checks each stated formula
(temperature, top_p, max_tokens, the context/tool/retry thresholds, the
regime rule) against core across the full 0–100 range — so if core's mapping
changes, the page's stated math fails loudly instead of drifting.

**Payload.** `buildPayload(text, R̂)` = `How to answer me: <instruction>` +
blank line + `My message:` + the trimmed text. The "Send the dials with it"
checkbox (default on) controls whether the instruction travels; the right
pane says so when it is off. Send uses core's `buildHandoff` (URL prefill
for ChatGPT/Claude/Perplexity/Grok; clipboard-then-open for Gemini/Copilot).
Nothing is sent from the page.

**Info bubble.** "What is this doing?" opens a region whose copy comes from
`lib/landing-copy.ts` in the visitor's *Reading as* register (`sub`, three
`beats`, and the new `dials` field) — the pill in the nav keeps its job.
Register copy is offer-free by test.

**Deliberately not on the face:** the Bridge dials (`/bridge`), the return
leg's reply decoder (`/bridge`), the model persona panel (`/send`), sprawl
segmentation (`/send`). `/send` keeps the full `SendBox`.

## /loop as an installable app (M2 — Mobile Arc Build Spec)

The `/loop` page is the zero-install surface of the two-surface mobile
architecture (the vault-native surface is the Obsidian plugin). M2 adds:

- **Installable:** `app/manifest.ts` (served at `/manifest.webmanifest`),
  icons in `public/icons/`, `start_url: /loop`.
- **Offline shell:** `public/sw.js` — cache-first for hashed build assets,
  network-first navigations with a cached `/loop` fallback. **`/api/*` is
  never cached**: interpretation is always live, answers are never stale.
  Registered by `components/SwRegister.tsx` (production only).
- **Offline capture (`lib/offline-drafts.ts`):** the dump box autosaves a
  rolling draft to IndexedDB while you type (debounced); a send attempted
  offline is preserved as its own draft. On return, "Pick up where you left
  off" restores it. **Nothing auto-sends** — interpretation only runs on the
  user's tap. Store is dependency-free and injectable (unit-tested with an
  in-memory backend).
- **Accessibility settings (`lib/loop-prefs.ts`):** panel-local text size
  (Default/Large/Larger — page-scoped, never fights browser zoom) and
  response pacing (Instant/1s/2s) implemented as a **floor on
  time-to-render, never an addend** — slow networks already count toward it.
  Persisted in localStorage; mirrors `packages/obsidian/src/ui-prefs.ts` so
  both surfaces behave identically.
- **Screen-reader layer:** one persistent polite live region announces round
  completions, held locks, offline saves, and answers (a region remounted
  per stage never announces — this one is mounted once). Focus management on
  stage swaps was already present.
- **Mobile ergonomics:** ≥44px targets on lines and primary actions,
  dictation hint on coarse-pointer devices (the OS keyboard's mic key — no
  speech pipeline shipped).

## /connect — the second-brain connect page

`/connect` is the consumer-register setup page for the second-brain server
(`packages/vault-mcp`, published as `@travisbergen2/second-brain-mcp`). It
gives a non-technical person one path per AI app, in friction order:

1. **Claude Desktop** — the one-click `.mcpb` add-on (a GitHub release
   asset; nothing else to install). The page shows the bundle's sha256 and
   the sha256 of the server file inside it, which is byte-identical to the
   npm dist.
2. **Cursor / VS Code** — install deeplinks (`cursor://…/mcp/install`,
   `vscode:mcp/install`) built client-side from the folder the user types.
3. **Claude Code** — the `claude mcp add` one-liner.
4. **Windsurf / Gemini CLI / LM Studio / Claude Desktop manual** — one JSON
   snippet plus where to paste it.
5. **ChatGPT** — stated honestly as remote-only (cannot reach local files).

Then the "start your brain" links (official Obsidian downloads, Web Clipper,
Importer) and the "what leaves your computer" section, whose numbers are
read from the same constants the server enforces.

**Single source of truth:** `lib/connect.ts` — package identity, release
tag/file/digests, link builders (isomorphic; UTF-8-safe base64, no `Buffer`),
the client inventory with each mechanism's verified documentation URL, and
the start-link allowlist. `components/ConnectLinks.tsx` is the client
component (one folder field re-renders every link/snippet; copy buttons
announce to a live region; keyboard parity per the a11y ratchet).

**Tests (`tests/connect.test.ts`)** cross-check the package name/version/
registry id against `packages/vault-mcp/package.json`, the privacy caps
against `@rpcs1/core`'s `SELECT_CAPS`, round-trip every link builder
through a decoder (Unicode paths, spaces, Windows backslashes), enforce the
start-link host allowlist, enforce the consumer-register rule (no
mechanism vocabulary in the page copy — the same ratchet as `/pricing`),
and assert the route is wired into the homepage, Labs, footer, docs index,
and sitemap.

**When the bundle is re-released:** update `bundleVersion`, `bundleTag`,
`bundleFile`, `bundleSizeLabel`, `bundleSha256`, and `serverDistSha256` in
`lib/connect.ts` (and `npmVersion` if the package bumped — the test fails
loudly if it drifts from `packages/vault-mcp/package.json`).

## Development

```
npm run test --workspace=packages/web   # vitest (incl. loop-prefs, offline-drafts, connect)
npm run lint --workspace=packages/web
npm run build --workspace=packages/web
```

Bump `VERSION` in `public/sw.js` when changing the service worker.
