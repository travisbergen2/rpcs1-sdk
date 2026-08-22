# The Loop — elected-span interpretation ratchet (Phase A)

The hero interaction of the Explicit Formula one-product consolidation
(2026-08-22 spec): the user brain-dumps; the model rebuilds the dump into the
precise prompt the user most likely means; the user **locks** the lines that
read right; each following round re-derives **only** the unlocked remainder,
using the locked lines as anchored evidence. When it reads right, the finished
prompt is copied into any AI — or answered in-app.

## The ratchet law

> Every locked line appears in the next round verbatim — verified mechanically,
> never by trusting the model.

"Verbatim" means equality under one deterministic normalizer (Unicode NFC,
trim, internal whitespace collapsed), applied to both sides of every
comparison. Enforcement order in `finalizeRound`:

1. `parseLoopResponse` — tolerant JSON-array extraction (fences and prose
   stripped); malformed output → `null` (the route retries once with a stricter
   reminder, then fails honestly).
2. `verifyRatchet` — every elected span must match one candidate item,
   normalized-exact, one candidate per elected duplicate.
3. `repairRatchet` — on violation, missing/mutated locked lines are
   deterministically re-inserted (surviving locks keep the model's placement;
   missing locks insert after the last placed lock, original relative order
   preserved). The response carries `repaired: true` + the violated ids, and
   the UI tells the user their locked lines were held in place.

A misbehaving model can therefore slow the loop, but cannot break the ratchet.

## Where things live

| Piece | Path |
|---|---|
| Engine (pure logic, no fetch) | `packages/core/src/loop.ts` |
| Engine tests | `packages/core/tests/loop.test.ts` |
| API (`tool: "loop"`, `tool: "loop_answer"`) | `packages/web/app/api/translate/route.ts` |
| UI | `packages/web/app/loop/page.tsx` (route `/loop`) |

## API contract

`POST /api/translate`

Round 1: `{ "tool": "loop", "text": "<the dump>" }`
Round n: `{ "tool": "loop", "text": "<the dump>", "spans": [<previous spans>], "electedIds": ["s1", ...] }`

Response: `{ spans: LoopSpan[], repaired: boolean, violations: string[], engine: string }`
where `LoopSpan = { id, text, status: "kept" | "revised" }`.

Answer step (optional): `{ "tool": "loop_answer", "prompt": "<converged prompt>" }` →
`{ answer, engine }`.

Failure modes are explicit, never silent: `503 model_unavailable` (no gateway
configured — the loop has no rules fallback, reinterpretation requires a
model), `429 budget_exhausted` (daily free budget), `502 model_error` /
`502 unparseable` (transient). Input caps: 8000 chars, 64 spans.

Model spend shape: each round is one cheap-model completion (≤1200 tokens out)
through the existing gateway budget rails (`allowModelCall`); the loop adds no
new spend surface.

## UI flow

1. **Input** — textarea, "Show me what it heard."
2. **Rounds** — split view: the dump (immutable, left) beside tappable lines
   (right). Tap = lock (✓, green). "Redo the unlocked lines" (disabled at 0
   locked — the ratchet needs an anchor — and at all-locked — finish instead).
   "It's right — finish it" → final. Round counter + locked count shown;
   repaired rounds surface "your locked lines were held in place."
3. **Final** — the converged prompt, Copy, optional "Answer it here," back /
   start over.

Consumer copy is outcome-first per the house naming rule: "lines" and "lock" —
spans/ratchet/parameters never appear in the UI.

## Tests

```
npm run test --workspace=packages/core    # engine: segmentation, parsing,
                                          # ratchet verify/repair, end-to-end
                                          # monotone lock-in
```

The ratchet suite includes a misbehaving-model case (locked line mutated and
dropped → repaired deterministically) and an end-to-end three-round lock-in
check.

## Deferred (named, not forgotten)

- **PWA manifest/icons** — installability is Phase A polish, not the demo path.
- **Profile-tuned interpretation** — pass the intake `ReceiverProfile` into the
  loop's system prompt (machinery exists in core; wiring deferred to keep this
  PR reviewable).
- **Handoff deep links** — `buildHandoff` exists in core; the final screen can
  grow "open in your AI" buttons next to Copy.
- **Vault feedback (Phase B)** — misread→repair pairs from rounds become
  per-user learnings that shorten future loops; rounds-to-convergence is the
  product's own falsifiable metric.
- **Home-page/nav entry** — `/loop` is reachable by URL; linking it from the
  landing page is a copy decision for the rebrand pass.
