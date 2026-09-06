# E-RX-2 — frozen registration artifacts

**Status: FROZEN 2026-09-05 ~22:45 CT on Travis's go ("Freeze E-RX-2 with the defaults"). NOTHING DISPATCHED. No subject has seen any text in this directory.**

Protocol document (design, endpoints, verdict grammar, registered expectations, deviation log):
*E-RX-2 Protocol — Does Per-Model Targeting Beat Generic Hygiene?* (Hyperagent document `cmtozvg640c3y06ad359jjbh7`).

| File | What it is |
|---|---|
| `items.json` | The 10 frozen items: arm-A ("naive") text, the declared clauses each transformation may act on, the mechanical EXECUTE key. 4 differential items (RX2-05..08). |
| `subjects.json` | The 6 subjects, their directive lists from the pinned receiver table (`packages/core/src/receivers.ts` blob `83e2b7f…`, v0.3.0, main `fcd3073`), the implied own sets, swap partners and swap sets, and the `p2_primary` flag (members of the two mutual swap pairs Q⇄N and P⇄S, over which the lock-and-key endpoint is pooled). |
| `rules.json` | Rule constants: the five E-RX-1 rules verbatim, E-RX-2's two additions (T-FENCE-min, T-STAKES), application order, the directive→transformation map, the placebo pool. |
| `generate.mjs` | Deterministic arm generator: rule application only. Writes `arms.json` + `MANIFEST.json`. |
| `arms.json` | Every subject × item × arm text (300) with sha256 and provenance (applied transformations, inserted/deleted characters, placebo target and length rule). |
| `MANIFEST.json` | sha256 of every input and of `arms.json`; counts. |
| `score.mjs` | The frozen mechanical scorer (EXECUTE / ETN / OVERRIDE per key type). |
| `test/erx2.test.mjs` | Freeze-integrity tests: reproducibility, manifest hashes, item-bank constraints, subject/set consistency, arm composition, E-RX-1 rule fidelity, placebo rules, scorer behavior, zero reuse of E-RX-1 texts. |

```
cd experiments/e-rx-2
node --test              # integrity tests
node generate.mjs        # regenerate (must be byte-identical; the test checks)
```

Any edit to `items.json`, `subjects.json`, `rules.json`, or `score.mjs` after this freeze is a **deviation** and must be logged in the protocol document before any scoring.
