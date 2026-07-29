# Entropy Routing — the commit-vs-clarify layer

`@rpcs1/core` exports a deterministic routing layer that decides, for an
ambiguous input, whether to **commit** to the dominant interpretation,
**present** the live options, or **ask** one clarifying question — based on
the entropy of a posterior over competing interpretations.

Most systems force-collapse ambiguity to a single reading and act on it. This
layer keeps every plausible reading alive, measures how ambiguous the input
actually is, and only commits when the evidence justifies it. High ambiguity
produces a question, not a guess.

## The pipeline

```
text
  → likelihood per hypothesis   (scoreLexicalLikelihoods, or your own scorer)
  → posterior                   (computePosterior / updatePosterior)
  → normalized entropy T̂ ∈ [0,1]
  → routing decision            (routeByEntropy)
```

One-call form:

```ts
import { routeIntent, DEFAULT_INTENT_HYPOTHESES } from '@rpcs1/core';

const d = routeIntent(
  'I need something to make my business more efficient.',
  DEFAULT_INTENT_HYPOTHESES,
);
// d.mode === 'clarify' — several intents are live, so it asks instead of guessing:
// d.clarifyingQuestion:
//   'Just to make sure I read you right — is this closer to
//    "save time / automate a task" or "reduce cost"?'
```

An unambiguous input commits silently:

```ts
routeIntent('my build is broken and throws an error', DEFAULT_INTENT_HYPOTHESES).mode
// 'commit'  (top: troubleshoot)
```

## Decision modes

| mode | meaning |
|---|---|
| `commit` | one reading dominates — proceed silently |
| `commit_with_note` | proceed on the top reading, disclose the close alternative |
| `present_options` | no dominant reading — show the live readings as choices |
| `clarify` | ambiguity too high — ask one targeted question first |

Boundaries: `commit` when `T̂ ≤ tCommit` (and the top margin clears
`minCommitMargin`); `clarify` when `T̂ ≥ tClarify`; `present_options`
in between. Defaults: `tCommit 0.45`, `tClarify 0.75`, margin `0.15`.

## Receiver-conditioned thresholds

`thresholdsFromProfile(profile)` derives the boundaries from the receiver's
AR setting, mirroring the intake bands: high-AR receivers want ambiguity
resolved for them (wider commit region); low-AR receivers want to be asked
(wider clarify region). High-FT (literal) receivers require a larger margin
before a silent commit — a near-tie gets disclosed rather than dropped.

```ts
routeIntent(text, hypotheses, { profile }); // profile: ReceiverProfile from intake
```

## Multi-turn accumulation

Pass the previous turn's posterior to accumulate evidence across a
conversation. The forgetting factor `λ ∈ [0,1]` controls how fast old
evidence about intent expires (`1` = full memory, `0` = fresh start; default
`0.7`):

```ts
const first = routeIntent(turn1, hypotheses);
const second = routeIntent(turn2, hypotheses, { previous: first.posterior });
```

A clarifying answer collapses the posterior: entropy drops, the router
commits, and the conversation moves on.

## Custom hypothesis sets and scorers

`DEFAULT_INTENT_HYPOTHESES` is a generic starter (save time / save money /
learn / build / buy / troubleshoot / other). Real deployments should supply
their own set — e.g. a product catalog's solution categories — each with
lexical `cues` for the built-in scorer, or with externally computed
likelihoods:

```ts
routeIntent(text, myHypotheses, { likelihoods: modelDerivedScores });
```

External (model-derived) likelihoods plug into the same shape; label them as
such in your telemetry. The routing mathematics stays deterministic either
way: identical posterior → identical decision.

## Honest scope

- Entropy measures ambiguity **between the supplied hypotheses**. It cannot
  detect that the true intent is missing from the set — include a catch-all
  hypothesis when the set is not exhaustive.
- The built-in scorer is lexical cue matching: transparent, deterministic,
  and shallow. It is the floor, not the ceiling; swap in a stronger scorer
  through `likelihoods` when you have one.
- Entropy is invariant under relabeling of hypotheses (pinned by a unit
  test). Any evaluation of whether hypothesis *semantics* matter must scramble
  the likelihood models, not the labels.
- The mathematics is standard multi-hypothesis sequential analysis (MSPRT
  lineage: Armitage 1950; Baum–Veeravalli 1994); posterior-entropy stopping
  approximates its rule. The contribution here is architectural — wiring the
  commit-vs-clarify choice to the receiver's own AR/FT settings.

## The branching tree: who grows it, who holds it

The router HOLDS and COLLAPSES a tree of readings; it does not GROW one. The
branches come from two generators:

- **The calling model** (broad, judgment-based): propose 3–7 readings of the
  message — including typo readings, idiom-vs-literal readings, and domain
  senses — and pass them as `hypotheses` with your likelihoods. This is the
  "model proposes, deterministic core disposes" contract.
- **The Mirror's lexical fork detectors** (bounded, guaranteed): deterministic
  branch-growers for confusable typos ("pay cast" → cash?) and two-sided
  polysemy ("meet me at the bank with the rods and the deposit slip") from a
  curated lexicon (`mirror-lexicon.ts`). Same input → same forks, no model in
  the loop. Silent on clean prompts, like every Mirror detector.

Neither generator replicates a full human lexicon; together they are the
buildable approximation, and the router's math is generator-agnostic.
