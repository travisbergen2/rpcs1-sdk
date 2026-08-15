# RPCS-1 Ambiguity Check (browser extension, v0.2.0)

Amber-flags phrasing a reader could parse more than one way — **before you send it**.
Spellcheck's red line says "that's not a word." This amber line says "those words
fork." It never claims to know what you meant; it shows what a receiver can
construct from the words alone.

Corrected build of the 2026-08-15 skeleton, verified against the real
`travisbergen2/rpcs1-sdk` repo (`packages/web/app/api/translate/route.ts`,
`packages/core/src/translator.ts` at commit `c83e6283`) and a live POST to the
deployed API.

---

## What was wrong in the original skeleton (all verified, all fixed)

| # | Skeleton assumed | Reality (repo + live check) |
|---|---|---|
| 1 | `POST https://rpcs1.dev/api/interpret` with `{text, risk}` | **No such route.** The API is `POST /api/translate` with `{tool: "interpret", text, risk}` — one route multiplexing on `tool`. |
| 2 | Response keys `"AR Level"`, `"Recovered Entities"`, `"Canonical Translation"`; entity span at `.surface/.text/.referent` | Those Title-Case names were the **MCP tool's rendered text**, not the API JSON. The real shape is snake_case `TranslationOutput`: `ar_level`, `recovered_entities[].original`, `canonical_translation`, `clarifying_questions`, `reading_paraphrases`, `engine`. |
| 3 | Flag when "AR3 or worse" (numeric `>= 3` gate) | **The AR scale is not ordinal in severity.** In `resolveAmbiguity`: AR0/AR1 = collapsed; within the no-collapse branch AR4 = nearly collapsed, AR3 = moderate, **AR2 = closer readings than AR3**, AR5 = near-tie (worst). A numeric gate silently drops AR2. Worse: the live engine returned **AR0 with an unresolved placeholder referent** (`"[the thing that needs fixing]"`) — collapsed overall, still exactly the case the squiggle exists for. Gate is now **per-entity** (bracketed placeholder or confidence < 0.75 — the engine's own question rule), with message-level AR ∈ {AR2..AR5} as a secondary badge trigger. |
| 4 | Wrap ambiguous text in `<span>`s inside `contenteditable` | **Never mutate a managed editor's DOM.** Gmail/Slack/Twitter compose boxes (ProseMirror/Draft/Lexical-class) own their DOM: foreign spans desync the model, get stripped on re-render, and drop the caret. v0.2 draws **overlay underline strips** from `Range.getClientRects()` in a container we own — the editor's DOM is never touched. |

## Files

```
manifest.json        MV3; host_permissions on rpcs1.dev (background fetch needs no CORS)
background.js        the only network code; calls /api/translate; caches
logic.js             pure decision + span logic (shared with tests; no DOM)
content.js           field binding, overlay strips, badge, hover card
styles.css           amber SVG squiggle, badge, card
test/logic.test.mjs  unit tests (node --test)
```

## Install

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → point at this folder
3. Type an ambiguous draft (≥ 12 chars) into Gmail/Slack/anywhere, pause ~0.7 s

## Run the tests

```
node --test test/
```

Covers: the live AR0-placeholder fixture, the AR2-must-flag regression (the
non-ordinal-scale trap), boundary/case/phrase span matching, card-copy caps.

## Behavior

- **Debounce 700 ms** on pause-in-typing; in-flight results are discarded if
  the draft changed (stale-guard). Repeat drafts are served from cache.
- **contenteditable**: amber squiggle strips under each unresolved referent;
  hover → card.
- **`<textarea>`/`<input>`**: no DOM text nodes to Range against, so v0 shows a
  corner **badge** + card. The pixel-perfect route is a mirror-div clone
  (fiddly: font metrics, padding, scroll-sync) — deliberate v1, not faked here.
- **Card copy rule**: ambiguity is attributed to the *string*, never the
  person. Card shows: the flagged phrase → "You know what it points to; a
  reader only has the words." → competing readings (model mode) → "Reads as:"
  canonical translation → "A reader's first question: …" (the engine's own
  clarify question, reframed receiver-side) → engine/AR tag.

## Calibration (2026-08-15, measured — this is why the engine gate exists)

Item bank from Travis's own claude.ai export: **ORIG** = the 24 usable human
messages that immediately preceded a detector-confirmed "that's not what I
meant" correction (real misread-preceding utterances); **CTRL** = 24 human
messages from the same conversations ≥3 messages from any detector event,
length-band matched, seeded sample; **REG** = the 4 catalog-quoted
register-misread sender strings. One `interpret` call each at `risk:"casual"`.

| Set | n | Flag rate (95% CI) | Model path | Rules path |
|---|---|---|---|---|
| ORIG (preceded real misreads) | 24 | 92% [74–98] | 3/5 | 19/19 |
| CTRL (non-event controls)     | 24 | 100% [86–100] | — (0 rows) | 24/24 |
| REG (register misreads)       | 4 | 4/4 | — | 4/4 |

Findings, at their grade:

1. **Rules path: no discrimination — 47/47 flagged including every control.**
   The pronoun word-list fires on essentially all conversational text
   (ORIG−CTRL gap = 0 at 100%). Wallpaper, measured. Hence `shouldRender`:
   rules-path results never drive UI by default.
2. **Model path can say "clean"** (2/5 real items left unflagged) — but its
   control arm is **unmeasured**: the per-IP daily model budget was exhausted
   ~5 calls into the run, so engine correlated with item order. Next
   calibration must interleave ORIG/CTRL and use a budget-exempt path.
3. **Register misreads flag for the wrong reason.** All 4 REG items flagged
   via incidental pronouns — the engine detected referent gaps while the
   actual fork was register (literal-vs-distress). A flag that points at the
   wrong repair is worse than silence; register-fork detection is an engine
   roadmap item, not a threshold setting.
4. **Product consequence:** with engine gating, the free anonymous budget
   (~5 model calls/day observed) supports only a few checks per day before
   the squiggle goes quiet. Always-on use needs a keyed/paid path, a bigger
   budget, or a local model — a pricing decision, not a bug.

Caveats: n is small; CTRL means "did not precede a documented misread," not
"certified unambiguous"; corpus is human→AI conversation, transferred by
assumption to human→human drafting. Descriptive calibration, not a registered
experiment. Scripts + raw rows: `calib/` in the build workspace.

## Honest limits (v0)

- **Rules-mode fallback is gated off** (see calibration above). If you
  explicitly re-enable it (`shouldRender(result, {engineGate:false})`),
  expect an amber line on nearly every message.
- **Phrase-across-formatting miss.** A flagged phrase split across styling
  nodes (`that <b>thing</b>`) isn't located in v0 (single-text-node match).
- **Badges don't track scroll** until the next check; strips do.
- **Cost/budget**: each check POSTs the draft (tail-capped at 4000 chars) to
  rpcs1.dev. The model path spends the server's per-IP daily budget, then
  degrades to rules automatically. The card's engine tag tells you which ran.

## Privacy (say it plainly in any public listing)

Drafts are sent over HTTPS to **rpcs1.dev only** — your own server; no third
party sees keystrokes, and nothing is stored by the extension beyond an
in-memory cache. The stronger story is the **v1 local build**: `@rpcs1/core`'s
rules path is deterministic TypeScript with no model dependency, so it can be
bundled into the extension (`esbuild --bundle` an adapter exporting
`interpret`) and drafts never leave the machine. That was deliberately NOT
hand-ported here: `translator.ts` is marked *"canonical implementation — do
not fork it"*, and a hand copy would drift. Bundle the real package instead.

## Config

- `RISK_BY_HOST` in `content.js` — per-platform risk (`casual` | `advice` |
  `high-stakes` | `safety-critical`); default `casual`. Risk sets the
  collapse threshold server-side.
- `MIN_LEN`, `MAX_LEN`, `DEBOUNCE_MS` — top of `content.js`.
