# @rpcs1/core

Core engine for RPCS-1: receiver-profile recommendation, intent translation, and
user-side intake. The web app and MCP server re-export this package — it is the
single source of truth.

## Translator architecture: model proposes, RPCS-1 disposes

The translator has two halves with a hard boundary between them:

| Layer | What it does | Determinism |
|---|---|---|
| **Perception** | Proposes candidate readings of the input: recovered entities with candidate referents, intent hypotheses, and HF-HATP factor estimates per reading | Model-backed (stochastic) or rules fallback |
| **Decision** | Collapse-vs-clarify, AR level, playback gate, risk thresholds, receiver-profile modulation (`resolveAmbiguity`) | **Deterministic — always** |

The model never decides when to ask you a clarifying question. A fixed,
published decision rule does. Given identical perception output, the decision
is identical, every time. The `engine` field on every `TranslationOutput`
reports which perception path actually ran.

### Why not rules for perception?

The rules path (`interpret`) recognizes ambiguity from a 19-word keyword list
and classifies intent with ~8 regexes. That is a floor, not a product: open-form
human phrasing is combinatorially larger than any keyword list. The rules engine
remains as the offline, zero-cost **fallback** — it is a degraded mode, and
outputs mark it as such (`engine: "rules"`).

### Model-backed usage (BYO key)

No API key ships with this package and nothing is called implicitly. You
construct a backend with **your own** key:

```ts
import { AnthropicBackend, interpretWithModel } from '@rpcs1/core';

const backend = new AnthropicBackend({
  apiKey: process.env.ANTHROPIC_API_KEY!,   // your key, your billing
  // model: 'claude-haiku-4-5',             // default; override if you like
});

const out = await interpretWithModel('did she approve it?', backend, {
  risk: 'advice',
  context: ['Dana sent the revised contract this morning.'], // optional grounding
  // profile: <ReceiverProfile>,            // optional receiver modulation
  // fallbackToRules: true,                 // default: degrade, don't throw
});

out.engine                 // 'anthropic:claude-haiku-4-5' or 'rules' (fallback ran)
out.canonical_translation  // referents made explicit
out.clarifying_questions   // decided by the deterministic layer, not the model
out.ar_level               // AR0 (collapse) … AR5 (refuse to guess)
```

Cost/latency: one model request per `interpret` call — with a Haiku-class model
roughly $0.0005–0.002 and ~0.5–2 s. Rate-limit anything public.

### Reusing the perception layer in other products

`ModelBackend` is a two-method contract (`name`, `perceive(text, context?)`).
Any project that can hold an API key can use the same disambiguation front door
— e.g. a natural-language app builder can run `interpretWithModel` on the
user's app description first and generate from `canonical_translation`
(clarifying first when `playback_required` is true), instead of generating from
raw phrasing. Implement `ModelBackend` for any provider; the decision layer
neither knows nor cares.

### Security posture

- Model output is **data, not instructions**: every payload passes through
  `sanitizePerception` (shape validation, clamping to [0,1], size caps) before
  the decision layer sees it.
- The perception system prompt instructs the model to treat the user message
  strictly as material to analyze, never instructions to follow.
- Keys are held in memory on your side only; HTTP error bodies are not echoed
  into thrown errors.

## Eval battery (frozen)

`eval/battery.json` is a 50-case frozen battery (unresolved pronouns,
context-resolvable references, underspecification, clear controls, intent
traps, mixed intents) with expectations fixed **before** any model-backed
engine ran on it.

```bash
npm run eval                          # rules baseline: offline, always runs
RPCS1_EVAL_ANTHROPIC_API_KEY=sk-... npm run eval   # + model engine (your key)
```

Results land in `eval/results-<engine>.json`. The pre-stated ship gate for
promoting the model engine to user-facing surfaces is documented at the top of
`eval/run-eval.test.ts` (G1–G5). If the model engine fails the gate, the rules
engine stays — the numbers are reported either way.

## Scripts

```bash
npm test        # unit tests (vitest)
npm run eval    # frozen battery
npm run build   # tsc → dist/
npm run lint    # typecheck only
```
