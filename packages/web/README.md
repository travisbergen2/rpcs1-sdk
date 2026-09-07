# Explicit Formula — web app (`packages/web`)

Next.js app serving explicitformula.com (and rpcs1.dev, the mechanism home):
the `/loop` capture surface, the translator/tuner APIs, docs, and billing.

## The homepage is one conversation in two registers (2026-09-07)

Travis's correction of the 2026-09-04 build: the two panes are not "your words
/ a parse of your words" — they are **two registers of one live conversation**.

**The model's pane is its context window, made visible.** Each message you
send appears there as the model's own rewrite of it — *the prompt it would
write to itself* (the READ step, `READ_SYSTEM` in `lib/transcript.ts`),
streamed token by token. While it streams you can **Stop** it; when it settles
you can **edit it in place** or **type a correction in your own words** (the
rewrite re-runs with your correction attached, `<previous-rewrite>` +
`<correction>`); and **nothing runs until you press Go**. What you release is
literally the user message the model is run on. Its reply appears in that pane
in its own words (the ANSWER step), with the configured model's name under it.

**Your pane is your words, and the reply in your words.** Your message as
typed (plus any corrections — also your words), then the same reply
re-rendered into your register (the RENDER step, `RENDER_GUARD`): meaning held
fixed — every claim, number, negation, caveat, and question — wording changed
to match how you write. The instruction is your board's paragraph
(`renderInstruction(R̂you)` = core's `rewriteForProfile(...).rewrite_instructions`,
pinned by test), and the register sample is your own messages from this
conversation, newest first (`registerSample`, capped at 12 / 1500 chars), so
it improves as you talk. That rendering **is** the reply you read; rows are
aligned so the model's original is one glance to the right.

**Both boards are applied for real** — the page is the app now, so it can do
what a prefilled message never could. The model's board: `modelCallSettings`
= `mapToParameters(R̂model, 'generic')` → temperature, top_p, max_tokens are
the ANSWER call's parameters (pinned by test on a grid); `modelStance` =
`system_prompt_additions` joined → the system prompt. Context/tool-use/retry
strategies are still derived and shown but do nothing in a plain chat (the
copy says so). Your board: the RENDER instruction, above.

**Turn protocol** (`app/api/transcript/route.ts`, NDJSON frames):
`{ step: 'read', you, prior, previousReading?, correction? }` →
`{t:'reading',d}…{t:'done',engine}`; `{ step: 'answer', reading, prior, you:
R̂you, model: R̂model, samples }` → `{t:'reply',d}…{t:'rendered',d}…{t:'done',
engine}`; either may end in `{t:'error',code,message}`. Pre-stream JSON errors:
400 bad request, 503 `model_unavailable` (no key — there is no rules fallback
that can converse), 429 `budget_exhausted` (the same per-IP / global daily
budget as the loop and translator, **one unit per request; a turn is two
requests**). `prior` is the conversation **in the model's register** — prior
readings and replies, never your raw words — capped at 12 turns
(`contextFor`). Upstream: `lib/transcript-stream.ts` speaks OpenAI-compatible
`stream: true` SSE to whatever `lib/gateway.ts#getGatewayConfig` resolves
(Gemini 2.5 Flash-Lite by default; same env priority as `getGatewayBackend`),
45 s timeout, provider error bodies never echoed. `maxDuration = 60`.

**What leaves your machine** (`WHAT_LEAVES`, shown under the conversation and
ratcheted in `tests/instrument.test.ts`): on Send/Correct/Go your words, the
conversation so far, and both boards go to this site's server and on to the
configured model (named under each reply — reported by the route, never
asserted by the page; the provider's own data terms apply). The route stores
nothing. The transcript lives in `localStorage['ef.transcript.v1']`
(`lib/transcript-store.ts`, `useSyncExternalStore`, persisted on stable
transitions only — never per token; cross-tab sync deliberately off so a
second tab cannot clobber a stream). On reload, a reading caught mid-stream
becomes *awaiting*; a reply caught mid-stream becomes an error you can
**Answer again** — a partial rendering is never shown as the reply. **Clear**
removes it.

**Still on the face:** both fader boards (unchanged), the deterministic fork
squiggles and tap-to-lock chips in the composer, the pre-send whisper (core's
`interpret()` parse — "before you send, no model yet"), the info bubble in the
visitor's *Reading as* register, "Show the math" (now literal: the applied
settings), and the zero-cost exit — *Take this reading to your own app*
(`buildPayload` + `buildHandoff`) on any reading awaiting Go.

**Tests:** `tests/transcript.test.ts` — reducers, context and register sample,
storage normalization, the NDJSON and SSE codecs, `streamChatCompletion` with
an injected fetch serving canned SSE, the three prompt builders (guards,
verbatim reading as the last user message, instruction equality with
`rewriteForProfile`), the literal settings equality with `mapToParameters`,
request validation, and route source ratchets.

## The homepage is the instrument (2026-09-04)

> Superseded in part on 2026-09-07 (section above): the right pane is now the
> model's live reading and reply, not the deterministic parse; the hand-off is
> a secondary exit, not the send row; "Nothing is sent from the page" no longer
> holds — see *What leaves your machine*. Boards, faders, presets, equations,
> and info bubble below are unchanged.

`app/page.tsx` renders `components/Instrument.tsx` and a three-link row —
nothing else. No beats, no pitch sections, no offer copy on the face
(`tests/instrument.test.ts` ratchets this at the source level). Organizations
still reach licensing through the site-wide nav and footer.

**Two panes, each with a board on top — mixing-desk style.** Left — *You*:
your five faders above your words, which carry the deterministic fork
squiggles from `mirror()` (tap a squiggle or a chip to lock a reading; the
clarifier is appended exactly as on `/send`). Right — *The model*: its five
faders above *What the model hears*: the message as core's `interpret()`
parses it (unresolved referents bracketed), the questions the model would need
answered, whether it should check its reading first, **how it will run** (from
its board), **how to answer you** (from yours), and a collapsible "exact text
that will be sent" preview that is byte-for-byte the hand-off payload.

**Faders** (`components/Fader.tsx`, `.fader` in `globals.css`): a native
`<input type="range">` rotated −90°, so min is at the bottom and max at the
top, with a flat cap for a thumb and a level fill rising from the bottom like
an EQ band. Native control = keyboard, touch, and screen readers for free
(`aria-orientation="vertical"`, `aria-valuetext` carries the channel's trace
line). `components/FaderBoard.tsx` arranges five faders with a 0–100 scale
column (center detent at 50 = the neutral profile) and an LCD-style strip that
shows the touched channel — name, value, what down/up mean, the engine's trace
line — or the board's vector when idle.

**Your board = the receiver profile R̂(you).** Pace (TI), Tone (SG),
Directness (FT), Flexibility (UE), Ambiguity (AR) — the human-side names
core's profile card uses. It reads and writes `localStorage['rpcs1.rhat.v1']`,
the key `/calibrate` writes and the Bridge return leg reads, so a calibration
and a fader move are the same object.

**The model's board = R̂(model).** Memory (TI), Gain (SG), Trigger (FT),
Agility (UE), Commit (AR) — the same five primitives read as an agent
configuration through core's `mapToParameters(R̂, 'generic')`: temperature
and top_p from SG, max_tokens and context strategy from TI, tool-use gating
from FT and AR, retry from UE, plus `evaluateRegime`. Stored under its own key
`localStorage['rpcs1.rhat.model.v1']`. Both stores live in
`lib/rhat-store.ts` (`useSyncExternalStore`; the server renders neutral 50s).

**Presets on the model's board.** Six one-tap starting positions — The
Literal Reader, The Fast Committer, The Context Weaver, The Skeptic, The
Sprinter, The Open Book — lifted from the closed Repaste branch (#33) with its
claim discipline: each is a `ReceiverProfile` graded *provisional* (a sketch
of how a class of receivers reads, not a measurement; the strip says so
whenever one is selected). Choosing a preset sets all five faders; touching a
fader clears the preset label so the strip never claims a position the faders
no longer match. Your board has no presets — it has `/calibrate`.

**The equations are literal.** `lib/instrument.ts` derives every displayed
string from `@rpcs1/core`'s own functions. Your board: the instruction
paragraph is `directivesToInstructions(deriveRenderingDirectives(R̂))` —
identical to `rewriteForProfile(...).rewrite_instructions`; the per-channel
trace lines are core's `why` strings. The model's board: the stance is
`system_prompt_additions` joined; the settings line and per-channel trace
lines name core's returned values; "Show the math" prints each formula with
the numbers substituted. The test suite pins the instruction equality on a
grid and checks each stated formula (temperature, top_p, max_tokens, the
context/tool/retry thresholds, the stance thresholds, the regime rule)
against core across the full 0–100 range — so if core's mapping changes, the
page's stated math fails loudly instead of drifting.

**Payload.** `buildPayload(text, R̂you, R̂model)` =
`How to answer me: <your instruction>` / `How to run: <model stance>` /
`Requested settings (apply where your app allows; otherwise ignore): <settings>`
/ `My message:` + the trimmed text, blank-line separated. The "Send the boards
with it" checkbox (default on) controls whether the first three travel; the
right pane says so when it is off. Send uses core's `buildHandoff` (URL
prefill for ChatGPT/Claude/Perplexity/Grok; clipboard-then-open for
Gemini/Copilot). Nothing is sent from the page.

**Info bubble.** "What is this doing?" opens a region whose copy comes from
`lib/landing-copy.ts` in the visitor's *Reading as* register (`sub`, three
`beats`, and the `dials` field describing both boards) — the pill in the nav
keeps its job. Register copy is offer-free by test.

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

## Redirects

`next.config.mjs` owns the redirect table. Current entries: `/research` → `/rd`
(permanent; `/research` never existed as a route). `tests/redirects.test.ts`
checks every internal destination is a real `app/<route>/page.tsx` and that
no source shadows an existing page.

## Development

```
npm run test --workspace=packages/web   # vitest (incl. loop-prefs, offline-drafts, connect)
npm run lint --workspace=packages/web
npm run build --workspace=packages/web
```

Bump `VERSION` in `public/sw.js` when changing the service worker.
