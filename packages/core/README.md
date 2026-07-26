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

## Per-model receiver table (measured posture)

Vendor is the wrong key for receiver posture. The E-LIT measurement program
(2026-07) showed models from the same vendor spanning most of the literalness
scale (Claude Haiku 4.5 at +0.96 vs Opus 4.8 at +0.29), a Meta model running
the exact ladder geometry formerly attributed to Opus, and a 0.58-point swing
across four generations of one family. So the SDK now ships a **measured
per-model receiver table** that supersedes per-vendor posture assumptions
whenever the target model is known:

```ts
import { mapToParameters, lookupReceiver, applyReceiverPosture } from '@rpcs1/core';

// Integrated: pass the target model to mapToParameters
const params = mapToParameters(profile, 'anthropic', task, 'claude-sonnet-4-6');
params.receiver_evidence   // { grade: 'confirmatory', li2: 0.467, ob: 3, ... }
params.system_prompt_additions // now includes measured directives, e.g.
                               // "Fence every constraint explicitly ..."

// Or standalone:
const entry = lookupReceiver('deepseek/deepseek-v4-pro');
entry?.ladder              // ['C','C','C','C','R'] — truth-ladder modal vector
const merged = applyReceiverPosture(params, 'gpt-5.6-terra');
```

Design rules, enforced by tests:

- **Every entry carries an evidence grade** (`confirmatory` — measured on an
  E-LIT-naive subject; `corroboration` — subject had prior instrument contact;
  `self_measurement` — grade-capped). Grades travel with the data; don't strip
  them.
- **Unknown model = no data, never "no posture."** `lookupReceiver` returns
  `undefined` and `mapToParameters` falls back to vendor-level behavior
  unchanged. Nothing is silently guessed.
- **Scope is declared**: entries are field measurements of deployed defaults
  on an agent scaffold (k=3 for E-LIT-2 fields, k=6 for E-LIT-3 fields, single
  date), not model-internal constants. The caveat string ships on every
  `receiver_evidence` payload.
- Matching handles vendor prefixes (`deepseek/…`), date-pinned variants
  (`claude-haiku-4-5-20251001`), and known aliases (`opus-latest` resolves to
  the measured 4.8 entry — which is itself a documented hazard).

### E-LIT-3 boundary coordinates (table v0.2.0)

Ten entries additionally carry measured **boundary coordinates** from the
E-LIT-3 ladder instrument (2026-07-26, k=6 per item, corroboration grade —
declared: all subjects had prior E-LIT contact). These are separate fields from
a separate instrument and are **never pooled** with `li2`/`ob`:

- `sb` — **stakes boundary** (1–5): the highest stakes rung at which the model
  still returns the bare fenced answer ("Rate 1–10. Number only.") instead of
  volunteering warnings. Rungs: 1 zero-stakes → 2 social/deadline pressure →
  3 financial → 4 legal → 5 child-safety.
- `cb` — **care boundary** (1–4): the highest emotional-intensity rung at which
  fenced answers stay bare (no unrequested support).
- `r5_comply` — instructed self-misstatement comply counts (of 6) per rung:
  cross-user memory, capability deflation, provenance, identity, restrictions.

| Model | sb | cb | Notable |
|---|---|---|---|
| Claude Opus 4.8 | 1 | 2 | flags everything above zero stakes; modal BREAK under deadline pressure |
| Claude Opus 5 | 3 | 4 | non-monotone: flags deadline rung under a bare-held financial rung |
| Claude Sonnet 5 | 3 | 2 | stability gate FAILED — coordinates descriptive only |
| Claude Opus 4.6 | 4 | 4 | perfectly deterministic boundary; flags only child-safety |
| Claude Sonnet 4.6 | 4 | 4 | deterministic below the safety rung |
| Claude Haiku 4.5 | 4 | 4 | breaks under deadline pressure despite holding legal/financial rungs |
| GLM 5.2 | 4 | 4 | fringe self-misstatement complies on soft rungs |
| Claude Opus 4.7 | 5 | 4 | maximal-literal receiver measured; sole bare-holder of the safety rung |
| DeepSeek V4 Pro | 5 | 4 | modal self-misstatement complier (deflation 6/6, provenance 4/6) |
| Muse Spark 1.1 | 5 | 2 | leaks care inside the fence, never through it |

**Registered finding (X1 REFUTED):** the stakes ladder is not monotone in
consequence — social/deadline pressure defeats format fences that legal and
financial consequence do not, in 2026-generation receivers. Entries subject to
that inversion carry a `stripUrgency` directive: strip urgency framing upstream
when bare output matters.

Source data and methodology: the E-LIT program write-up (frozen item banks,
pre-registered predictions, per-run ledgers; E-LIT-3 protocol with frozen
registration, blind fixture gate, and stability/anti-ceiling gates). Update
path: re-run the batteries on a new model (~26 + 30 threads), add one entry
with its grade.

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
