---
name: rpcs1-translation-layer
description: "v2.0 - High-Fidelity Human-AI Translation Protocol (HF-HATP), receiver-profile aware. Generated from @rpcs1/core; supersedes ALL v1.9 SKILL.md copies. Explicit scoring algorithm, risk calibration, and R-hat(user) profile adaptation."
license: MIT (see repository LICENSE)
source: https://github.com/travisbergen2/rpcs1-sdk (canonical — regenerate from packages/core, do not hand-edit copies)
---

# High-Fidelity Human-AI Translation Protocol (HF-HATP) v2.0

Engineering specification for high-fidelity human-AI interpretation. v2.0 is generated from the shipped implementation in [`@rpcs1/core`](https://github.com/travisbergen2/rpcs1-sdk) and replaces every v1.9 package.

> **Deprecation rule:** any SKILL.md using bare factor names `IC / UE / EC / NM / SG / TI` is a stale v1.9 copy — delete it. Those abbreviations collided with the RPCS-1 receiver primitives (TI, SG, UE) and were renamed in the implementation.

## Core Principles

1. **Vocabulary Asymmetry**: Human language compresses meaning; AI expands it.
2. **Immutability of Literal Request**: Inferences augment but NEVER replace original input.
3. **Ambiguity vs. Uncertainty**:
   - **Ambiguity**: multiple valid interpretations exist (high margin risk).
   - **Uncertainty**: single interpretation with low evidence/confidence.
4. **Receiver Matching (new in v2.0)**: output is rendered for the *specific* human's receiver profile, not a lumped audience style. Fixed styles ("neurodivergent-explicit" etc.) are retired.
5. **Adaptive Learning**: profiles update from observed corrections, governed by the user's own Update Elasticity.

## The Receiver Profile — R̂(user)

Five RPCS-1 receiver primitives, each on a [0, 100] scale (`ReceiverProfile`):

| Primitive | Meaning |
| :--- | :--- |
| **TI** — Temporal Integration | how much history the receiver integrates |
| **SG** — Signal Gain | how strongly incoming signals are amplified |
| **FT** — Filtering Threshold | how conservatively action is gated |
| **UE** — Update Elasticity | how readily the model is revised |
| **AR** — Ambiguity Resolution | how aggressively uncertainty is resolved |

- Calibrated by the 5-item intake (`scoreIntake`), one item per primitive.
- Mapped to concrete `RenderingDirectives`: structure (`bluf` / `balanced` / `context_first`), warmth (`minimal` / `moderate` / `warm`), explicitness (`explicit_literal` / `moderate` / `implication_ok`), revision posture (`consistent` / `balanced` / `open_challenge`), ambiguity handling (`clarify` / `commit_with_note` / `commit`).
- Refined online by `updateProfile` (step size governed by the profile's own UE — a rigid profile resists being rewritten by one bad day).
- `profileDivergence` compares self-reported vs. observed behavior (the "masking mirror").

## The Interpretation Pipeline

`interpret(text, risk, profile?)` runs a staged pipeline: literal parse → entity recovery → intent recovery → canonical translation → candidate scoring → risk evaluation → playback decision. The literal request is never replaced, only augmented.

## Candidate Scoring (HF-HATP factors)

Each candidate interpretation is scored with a weighted additive function over six factors. **v2.0 field names** (v1.9 abbreviations kept only as historical aliases):

| Factor | v1.9 alias | Weight | Sign |
| :--- | :--- | :--- | :--- |
| `interpConf` — interpretation confidence | IC | 0.30 | + |
| `userEvid` — user evidence | UE | 0.25 | + |
| `epistemic` — epistemic commitment | EC | 0.15 | + |
| `narrative` — narrative momentum | NM | 0.10 | + |
| `semGap` — semantic gap | SG | 0.10 | − (penalty) |
| `transInteg` — translation-integrity violation | TI | 0.10 | − (penalty, asymmetric via `ti_penalty_multiplier`) |

`resolveAmbiguity(candidates, risk)` selects a winner only when the score margin clears the risk threshold; otherwise it returns a clarification path.

## Risk-Based Calibration

| Risk Category | Margin threshold | Behavior |
| :--- | :--- | :--- |
| `casual` | 0.15 | execute if margin > 0.15 |
| `advice` | 0.30 | execute if margin > 0.30 |
| `high-stakes` | 0.60 | execute if margin > 0.60 |
| `safety-critical` | 0.85 | execute if margin > 0.85 |

Ambiguity budget: after 2 unsuccessful clarification attempts, present top interpretations, explain the unresolved ambiguity, and ask the user to choose.

## Using It

**MCP server** (Streamable HTTP, no auth): `https://rpcs1.dev/mcp` — tools: `recommend_agent_configuration`, `interpret`, `normalize`, `rewrite`.

**SDK** (`@rpcs1/core`):

```ts
import {
  interpret, normalize, split, rewrite, route, score, resolveAmbiguity,
  rewriteForProfile, scoreIntake, deriveRenderingDirectives,
  updateProfile, profileDivergence, buildProfileCard,
} from "@rpcs1/core";

const profile = scoreIntake(answers);            // 5-item R̂(user) calibration
const out = interpret(text, "advice", profile);  // profile-aware interpretation
const rw = rewriteForProfile(text, profile);     // receiver-matched rendering
```

## References

[1] Bergen, T. (2026). *IMM Paper Series* (incl. Paper 9: RPCS-1; Paper 17: LLM Assay Battery). Zenodo. https://doi.org/10.5281/zenodo.19697792
