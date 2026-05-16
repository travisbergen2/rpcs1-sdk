# RPCS-1 SDK Architecture

## Core Concepts

The SDK translates five environment + task inputs into five receiver primitives, then maps those primitives to platform-specific LLM parameters.

```
RecommendInput
    ├── task: { task_summary, domain, expected_duration }
    ├── environment: { entropy, predictability, stakes, context_relevance, commitment_style }
    └── target_platform: anthropic | openai | open_source | generic
         │
         ▼
    computeReceiverProfile()
         │
         ├── TI = matchingPrincipleTI(H)      ← Pred-09-5: TI ~ 1/H
         ├── SG = f(stakes, predictability)    ← Basin stability
         ├── FT = f(stakes, commitment_style)  ← Conservative gating
         ├── UE = f(H, context_relevance)      ← Update elasticity
         └── AR = f(commitment_style, stakes)  ← Ambiguity resolution
              │
              ▼
    mapToParameters(profile, platform)
              │
              ├── temperature = 1 - SG/range   ← High SG → low temp (crisp)
              ├── max_tokens  = f(TI, range)    ← High TI → more tokens
              ├── context_strategy = f(TI)      ← TI≥65 → long_window
              ├── tool_use_strategy = f(AR, FT) ← High FT → explicit_confirmation
              ├── retry_strategy = f(UE)        ← High UE → aggressive retry
              ├── model_recommendation = f(TI, SG, UE)
              └── system_prompt_additions = f(FT, TI, AR)
                   │
                   ▼
              evaluateRegime(profile)
                   │
                   ├── near_oscillation: TI≥65 ∧ SG≥55
                   ├── near_overload:    TI≤35 ∧ SG≥65
                   ├── near_freeze:      UE≤35 ∧ FT≥65
                   └── stable: none of the above
```

## Design Constraints

1. **Deterministic** — identical inputs must always produce identical outputs. No randomness, no ML.
2. **Explainable** — every output must trace back to a named IMM principle or config value.
3. **Parity** — TypeScript and Python must produce the same numeric outputs (within ±1 TI, ±0.02 temperature).
4. **Config-driven** — thresholds and mappings live in JSON config files, not hardcoded in logic.

## Config Files

| File | Purpose |
|---|---|
| `config/matching.json` | Matching principle lookup table (H → TI), oscillation threshold, entropy scalars |
| `config/platforms.json` | Temperature ranges, max_tokens ranges, model recommendations per platform |
| `config/neurotypes.json` | Regime profiles (for Phase 2 diagnostic feature) |

## Stability Regime Boundaries

From `config/neurotypes.json` and Paper 9:

| Regime | Condition | Typical Symptom |
|---|---|---|
| near_oscillation | TI≥65 ∧ SG≥55 | Agent revisits decisions, refuses to commit |
| near_overload | TI≤35 ∧ SG≥65 | Agent acts on insufficient information |
| near_freeze | UE≤35 ∧ FT≥65 | Agent hedges endlessly, won't act |
| stable | none of the above | Balanced operation |

## Module Dependency Graph

```
recommend.ts / recommend.py
    ├── primitives.ts / primitives.py  (→ matching.ts / matching.py)
    ├── platforms.ts / platforms.py
    └── analysis.ts / analysis.py      (→ matching.ts / matching.py)
```
