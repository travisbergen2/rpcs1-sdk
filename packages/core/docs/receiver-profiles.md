# Receiver Profiles — Developer Guide (`@rpcs1/core`)

This guide covers the user-side receiver profile pipeline: intake → scoring →
rendering directives → online refinement → the self-vs-observed mirror, plus the
wire format (JSON Schema v1).

Everything here is deterministic and explainable. No ML. Every output traces to
a value in `packages/core/src/intake.ts`.

---

## 1. Concepts

A **ReceiverProfile** places a human continuously on five axes, each `[0, 100]`:

| Key | Name | Low (→0) | High (→100) |
|-----|------|----------|-------------|
| `TI` | Temporal Integration | bottom line first | full context first |
| `SG` | Signal Gain | flat & factual | warm & expressive |
| `FT` | Filtering Threshold | subtext lands | explicit & literal |
| `UE` | Update Elasticity | prefers consistency | pushback welcome |
| `AR` | Ambiguity Resolution | clarify first | commit & answer |

Design rules:

- **Behavioral forced-choice, not self-diagnosis.** We never ask for or assign a
  category label. ASD / ADHD / AuDHD are different *regions* of the same
  continuous space — never three boxes, and never one lumped "neurodivergent mode".
- **A quick intake is a noisy prior.** It refines online from real interaction
  (`updateProfile`), at a rate governed by the user's own `UE`.
- **The profile is the source of truth.** Directives are derived; on conflict,
  re-derive from the profile.

## 2. Intake

`INTAKE_ITEMS` is a five-item behavioral calibration — one item per primitive.
Each option maps to an anchor position on that axis.

```ts
import { INTAKE_ITEMS, scoreIntake, type IntakeAnswers } from '@rpcs1/core';

const answers: IntakeAnswers = { TI: 'a', SG: 'a', FT: 'a', UE: 'a', AR: 'a' };
const profile = scoreIntake(answers);
// → { TI: 20, SG: 25, FT: 80, UE: 75, AR: 75 }
```

Missing answers fall to a neutral `50`. Partial intake is valid — it just means
a weaker prior.

## 3. Rendering directives

`deriveRenderingDirectives(profile)` deterministically maps the profile to five
directives, with band thresholds `<40 → low`, `40–60 → mid`, `>60 → high`
(`FT` and `AR` use their documented inversions):

| Directive | From | Values |
|-----------|------|--------|
| `structure` | TI | `bluf` \| `balanced` \| `context_first` |
| `warmth` | SG | `minimal` \| `moderate` \| `warm` |
| `explicitness` | FT | `explicit_literal` \| `moderate` \| `implication_ok` |
| `revision` | UE | `consistent` \| `balanced` \| `open_challenge` |
| `ambiguity` | AR | `clarify` \| `commit_with_note` \| `commit` |

Every directive carries a one-line `why` trace (e.g. `"TI=20: lead with the
conclusion"`) for the transparency card — the user can always see *why* the
bridge renders the way it does.

```ts
import { deriveRenderingDirectives } from '@rpcs1/core';

const d = deriveRenderingDirectives(profile);
// d.structure === 'bluf'; d.why.structure === 'TI=20: lead with the conclusion'
```

`buildProfileCard(profile)` bundles profile + directives + a plain-language
summary the user can read and edit.

## 4. Online refinement

The intake prior is refined from observed behavior with a bounded,
UE-governed update:

```ts
import { updateProfile } from '@rpcs1/core';

// new = prior + rate * (observed − prior)
// rate = clamp((gain ?? prior.UE/100) * 0.3, 0.02, 0.5)
const refined = updateProfile(prior, { TI: 65 });
```

Users who self-describe as more elastic (higher `UE`) let their profile move
faster. The rate is clamped so a single observation can never swing the profile.

## 5. Self-vs-observed mirror ("masking shape")

The user **sets** where they think they are; the system **tracks** where their
messages actually land. `profileDivergence(selfSet, observed)` returns the signed
per-axis delta, a mean-absolute magnitude, and plain-language notes for any axis
where the gap ≥ threshold (default 20).

The gap is surfaced back to the user — never silently acted on.

```ts
import { profileDivergence } from '@rpcs1/core';

const div = profileDivergence(selfSet, observed);
// div.magnitude, div.delta.FT, div.notes[]
```

## 6. Wire format (JSON Schema v1)

Canonical schema: [`https://rpcs1.dev/v1/receiver-profile.json`](https://rpcs1.dev/v1/receiver-profile.json)
(source: `packages/web/public/v1/receiver-profile.json`).

```json
{
  "$schema": "https://rpcs1.dev/v1/receiver-profile.json",
  "version": "1.0",
  "profile": { "TI": 20, "SG": 25, "FT": 80, "UE": 75, "AR": 75 },
  "directives": {
    "structure": "bluf",
    "warmth": "minimal",
    "explicitness": "explicit_literal",
    "revision": "open_challenge",
    "ambiguity": "commit"
  },
  "meta": { "source": "intake", "generator": "@rpcs1/core" }
}
```

Rules for consumers:

1. `version` and `profile` are required; everything else is optional.
2. If `directives` are present they MUST be re-derivable from `profile`;
   treat `profile` as canonical and re-derive on conflict.
3. `meta.source` records provenance: `intake` (quick prior), `observed`
   (behavioral estimate), `manual` (user edit), `blended` (updateProfile output).

## 7. Naming note (avoid an old collision)

The five receiver primitives (`TI/SG/FT/UE/AR`) are the **only** things called
primitives in this codebase. The translation-scoring quantities formerly named
`TI/SG/UE` in the HF-HATP scorer were renamed to avoid collision. If you see
old code or docs using those names for scoring, they are stale.

## 8. Epistemic status

- The directive mappings and update rules above are **design decisions**
  implemented deterministically — auditable in `intake.ts`, covered by tests.
- The underlying receiver laws are **derived** under named assumptions
  (IMM Paper 18).
- The claim that a five-item intake usefully predicts communication preferences
  is a **registered, testable hypothesis** — the human-side validation battery is
  pre-registered and not yet run. Do not represent it as validated.
