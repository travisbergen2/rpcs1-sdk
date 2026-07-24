# Battery v3 — Gate Spec & Authoring Rules (frozen before v3 exists)

Adopted 2026-07-24 by the project owner after adjudicating every battery-v2
disagreement case. This document governs the authoring of `battery-v3.json`
and the verdict rules for its single confirmatory run. It is committed before
any v3 case exists; the git history is the firewall.

## 1. Gate design: SWAP vs CLAIM (adopted, replaces the v1/v2 absolute gates)

Two gate families answering two different questions:

### SWAP gates — which engine serves users by default?
Baseline-relative, head-to-head on the same battery (difficulty cancels).
Baseline = the rules engine **pinned at commit `2f19427`** (never edited).

| Gate | Bar |
|---|---|
| S1 clarify-decision accuracy | ≥ rules + 10 pts |
| S2 intent accuracy | ≥ rules + 20 pts |
| S3 false-clarify on clear controls | ≤ rules |
| S4 context grounding | ≥ rules + 50 pts |

### CLAIM gates — what may be said publicly?
Absolute; aspirational; failing them costs a marketing sentence, not a rollback.

| Gate | Bar |
|---|---|
| C1 clarify-decision accuracy | ≥ 85% |
| C2 entity recall | ≥ 90% |
| C3 false-clarify on clear controls | ≤ 15% |
| C4 context grounding | ≥ 90% |

Standing already-earned claim (independent of v3): *context grounding 100% on
two frozen batteries (v1, v2) vs 0% for the rules baseline.*

### Verdict rules
- Battery v3: **100 cases**, category proportions identical to v1/v2 (×2):
  20 unresolved_pronoun / 16 context_resolvable / 16 underspecified /
  20 clear_control / 16 intent_trap / 12 mixed_intent.
- Rules baseline measured on v3 **before** any model contact; SWAP bars
  instantiate from it at that moment and then freeze.
- Single confirmatory shot. A gate passes only if the point estimate clears
  its bar by **more than one case-equivalent** (1 case = 1 pt at n=100).
- Stability check: if the v3 rules baseline lands more than 15 pts outside
  the v1–v2 range on any metric, the run is declared INSTRUMENT-UNSTABLE and
  not scored; fix authoring, write v4.
- Runs with >10% model hard-failures are INFRASTRUCTURE-INVALID, not verdicts.

## 2. Clarify expectations — adjudicated ground truth (owner rulings, 2026-07-24)

Every v2 clarify/recall disagreement was adjudicated by the owner. The rulings
below are the authoring law for v3 expectations.

### Expect `clarify: true` when
- **T1. Unresolved referent**: a pronoun, deictic (this/that/there), or definite
  description has no antecedent in the message or provided context.
- **T2. Lexical/numeric ambiguity that changes the action** — even when all
  referents resolve. *(Ruling 2A: "should I book it for seven?" — seven o'clock
  vs a party of seven. The referents resolved; the booking still can't be made.)*
- **T3. Deictic in an otherwise clear directive**: "that vendor", "the brief"
  with no antecedent anywhere is unresolved even inside a crisp imperative.
  *(Ruling 8A: "Double-check whether that vendor is still SOC 2 certified.")*
- **T4. Underspecified request**: the ask names no concrete success criterion
  ("sort out the usual mess").
- **T5. Bundled asks whose actions genuinely diverge.**

### Expect `clarify: false` when
- **F1. Context resolves it**: the antecedent appears in provided context.
- **F2. The message resolves itself**: quoted material, named attachments,
  in-message binding ("cut the demo if you think **it** drags" — it = the demo).
- **F3. Expressive register**: venting, rhetorical questions, emotional
  remarks. Reading the register correctly IS the task; asking is a failure.
  ("I just want to get this off my chest, no advice please.")
- **F4. Planning openers**: "where do I even begin with X" wants a general
  map, not an interrogation.
- **F5. Fully specified instructions**, including generic comparison requests
  whose extra parameters are optional depth ("compare renting vs buying").

### Expected-entities lists
- Include **only** referents that remain unresolved after F1/F2.
  *(Rulings R3/R4: in-message-resolved pronouns must NOT appear in expected
  entities — "send it to legal" where it = the file named two words earlier.)*
- A referent that is itself the reported unknown ("**something** about the
  forecast doesn't add up") is arguable — see §3.

## 3. Adjudicated-arguable patterns — excluded from gate weight

These patterns were adjudicated **keep-current-but-contested**. A case whose
expectation the author cannot defend in one sentence must not carry gate
weight. For v3: avoid these patterns entirely, or include at most one per
category tagged `"edge": true`; edge cases are reported but excluded from
gate computation.

- High-stakes confirm-before-execute ("ship it once QA signs off")
- Rhetorical remark containing an unresolved deictic ("who signs off on a design like this")
- Planning opener with unstated specifics
- Clear demand referencing an unresolved artifact ("prove you read the brief")
- Vague temporal adjuncts ("sometime")
- Self-referential unknowns ("something about X doesn't add up")

## 4. Intent expectations

Intent labels follow the taxonomy committed in the perception system prompt
(`packages/core/src/perception.ts`): labels are assigned by communicative
function, not grammatical mood — imperative information-requests ("list",
"convert", "compare") are `question`; rhetorical questions are `opinion`;
venting is `emotional_support`. The 10 v2 intent disagreements were NOT
individually adjudicated; v3 intent expectations must be derivable from the
committed taxonomy text alone, and any case where two readers of that text
would disagree must be reworded or dropped.

## 5. Record of v2 adjudication (for the ledger)

- Overturned (my expectation was wrong): C05 (2A), I06 (8A), M03 "it" (R3),
  M06 "it" (R4).
- Upheld (model over-asked / under-flagged): N05, N06, I02, I03*, I05*, I07,
  I08*, C04*, P09 "sometime"*, V08 "something"* — entries marked * were ruled
  arguable-keep-current and feed §3.
- battery-v2.json is NOT retro-edited: it is spent and stands as run.
  Rulings apply forward, to v3 authoring only.
