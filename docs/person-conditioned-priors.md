# Person-Conditioned Interpretation Priors — Design Spec

**Status: DESIGNED, NOT BUILT.** Roadmap item for the translation layer. Nothing in
this document describes shipped behavior; the shipped behavior is stated below for
contrast, honestly.

## What the translator does today (shipped)

Core `interpret(text, risk, profile?)` already models a *distribution* over meanings,
not a single fixed reading:

- generates candidate interpretations with per-candidate HF-HATP factor scores
  (`interpConf`, `userEvid`, `epistemic`, `narrative`, `semGap`, `transInteg`),
- computes a composite score per candidate and an **ambiguity margin** between the
  top candidates,
- compares the margin to a **risk-scaled threshold** to choose an AR level
  (AR0 direct … AR5 refuse) — commit, commit-with-note, or clarify,
- and, when a `ReceiverProfile` is supplied, uses it on the *decision side*
  (e.g. high FT tightens the clarify trigger).

So "model a distribution and update with context" is not a new idea for this system —
it is the existing mechanism. What the profile does **not** yet touch is the
*candidate distribution itself*: two different people currently get the same
candidate set and the same scores; only the commit/clarify decision differs.

## The gap this spec closes (not built)

**Person-conditioned priors:** the same utterance should yield a different posterior
over meanings for different receivers, because the receiver's own communication
distribution is evidence.

    P(meaning | utterance, context, receiver) ∝
        P(utterance | meaning, context) · P(meaning | context, receiver)

Concretely: for "It's cold in here," a high-FT profile shifts prior mass toward the
literal reading *as the sender's likely intent when addressing this receiver is
unknown*; a low-FT profile licenses more mass on the indirect-request reading.

## Proposed mechanism (deterministic, auditable — same house rules)

1. **Prior adjustment table, not ML.** A small, published mapping from profile
   coordinates to per-candidate-class log-prior nudges. Candidate classes already
   exist in core (`literal`, `ambiguous_reference`, `underspecified`, `alt`, …).
   Example shape (values illustrative, to be fixed at implementation):
   - FT > 60: literal-class prior +δ; implicature-class prior −δ
   - AR < 40: no prior change, clarify threshold tightens (already shipped)
   - SG > 60: affect-laden candidate classes gain +δ′ in *generation*, not selection
2. **Two-sided profiles.** The full version conditions on BOTH parties: the sender's
   profile shapes P(utterance | meaning) — how this person tends to encode — and the
   receiver's shapes the prior. Requires two profiles on the wire; the schema already
   transports profiles individually, so this is a call-shape change, not a schema change.
3. **Auditability requirement (binding):** every prior nudge must appear in the
   output's `why` trace ("literal +0.10: receiver FT=80"). No hidden conditioning.
4. **Update rule:** within a conversation, candidate-class priors update from
   confirmed interpretations (the user picked a reading or corrected one) with the
   same clamped, UE-governed rate as `updateProfile` — one confirmation never swings
   the prior.

## What would make this claim-worthy

- **Registered test:** for utterances with known ground-truth intent (vignette set),
  person-conditioned priors must beat the unconditioned baseline on interpretation
  accuracy for profiled users, with criteria frozen before data. Until that test
  runs and passes, the feature ships (if built) as "personalization heuristic,"
  never as "understands you better" — the same earned-grade rule as everything else.

## Non-goals

- No inference of psychological traits from usage. Priors condition on the declared,
  user-editable profile — nothing else.
- No cross-user learning. One user's corrections never move another user's priors.
