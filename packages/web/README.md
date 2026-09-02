# Explicit Formula — web app (`packages/web`)

Next.js app serving explicitformula.com (and rpcs1.dev, the mechanism home):
the `/loop` capture surface, the translator/tuner APIs, docs, and billing.

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
