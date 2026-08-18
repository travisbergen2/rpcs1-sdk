# The Structure of Ambiguity

*Why the mirror's detectors exist, derived instead of invented.*
*Adopted 2026-08-17, the night the founder typed "when did that happen" into his
own product and nothing underlined.*

## The law

A sentence is a dependency structure: every phrase either **fills a slot**,
**attaches somewhere**, or **points at something**. Each of those is an edge
the receiver must close.

> **Ambiguity happens wherever the sentence creates an obligation it does not
> discharge — or discharges more than one way.**
>
> Zero ways to close an edge → a **dangling** fork.
> Two or more ways → an **attachment** fork.
> Exactly one → **silence**.

Two consequences fall out before any detector is written:

1. **Silence on clean prompts is a theorem, not a UX preference.** A clean
   prompt is one where every edge discharges exactly once, so there is nothing
   to render. (This was already the module's registered decision #2; the law
   explains it.)
2. **A detector is never a list of suspicious words.** It is an edge type plus
   a discharge test. When a detector needs a growing list of exceptions, it is
   misdrawn — redraw the edge.

## The six edge types

| # | Edge | The obligation | Forks when… | Example |
|---|------|----------------|-------------|---------|
| 1 | **Reference** | a pointer must find a target *inside the prompt* (a fresh model session has no other universe) | 0 targets | "when did **that** happen" |
| 2 | **Attachment** | a modifier/coordination must pick a host | ≥ 2 hosts | "**A and B or C**", "watch the man **with the telescope**" |
| 3 | **Argument** | a predicate's required slots must be filled | slot empty | "**fix it**" — fix *what?* |
| 4 | **Scope** | operators must order themselves | ≥ 2 orders | "**only** the readme and the changelog" |
| 5 | **Act** | the sentence must be one speech act | ≥ 2 acts | "**can you** rename it" — ability question or request? |
| 6 | **Presupposition** | a construction assumes an unstated value | value absent | "make it **better**" — than what, along what axis? |

There is also a degenerate zeroth edge *below* the sentence: **token identity**
— which word/sense is this string at all? (typos, homophones, polysemy). Same
law applies: one supported identity → silence; two → fork.

## Deriving the existing detectors

Every `ForkKind` in `packages/core/src/mirror.ts` is an instance of the law.
The guards each detector carries are **discharge tests** — they detect that the
edge is already closed, which is why they suppress:

| Detector | Edge type | Opens the edge | Discharge test (the guards) |
|----------|-----------|----------------|------------------------------|
| `dangling_pronoun` (D1) | Reference | subject-position anaphor (it/this/that/these/those/they) | any content word before the pronoun (prior sentence or earlier in the same one) closes it; relative heads ("the file **that** is broken") and complementizer frames bind locally and are never claimed |
| `external_reference` (D2) | Reference (presupposed context) | "the above", "as discussed", "like before" | none possible in a fresh session — always a fork |
| `compare_or_choose` (D3) | Act (attachment-flavored) | "X or Y" inside a question | an explicit compare/choose verb closes the act edge; rhetorical "…or am I…", retrospective "was it X or Y", and invitation pairs ("thoughts or perspectives") are acts already discharged |
| `scope_fork` (D4) | Scope | "only/just" before a coordination | post-position ("…your mom only,") scopes backward — closed; cross-clause coordination is out of reach — closed |
| `grouping_fork` (D5) | Attachment | mixed "A and B or C" | uniform connectors ("A and B and C") have one parse — closed |
| `bare_object` (D6) | Argument | imperative verb + pronoun object | a long preamble likely contains the object — closed |
| `confusable_typo` (D7) | Token identity | word whose neighbor fits the context | support for the word *as written* closes it |
| `polysemy_fork` (D8) | Token identity | word with multiple senses | one-sided cue support means one identity — closed |

Division of labor worth keeping explicit: **subject-position** pronoun edges
belong to D1 (reference); **object-position** pronoun edges belong to D6
(argument), whose curated-imperative guard is its own precision strategy.
"fix **that**" is an argument fork, not a reference fork.

## Implementation laws

1. **Closed-class grammar only.** Position tests may consult auxiliaries,
   modals, wh-words, prepositions, determiners, pronouns — the finite skeleton
   of English. They may not consult curated open-class lists (verbs of saying,
   weather words, …). Open-class curation is the exception treadmill this
   document exists to prevent. (D6/D7/D8 carry deliberately curated lexicons —
   that is their explicit strategy, bounded and versioned, not a position
   test.)
2. **Silence outranks recall.** A documented miss is acceptable; a false
   underline teaches people to ignore the strip. Every claimed position must
   name its misses in the detector comment.
3. **No grammar vocabulary in fork copy — ever.** The UI never says
   "unclear antecedent", "scope", "complementizer". It says what the *receiver
   might do*: "the model will guess what 'that' is." The product teaches the
   skill without naming the rule. (The red squiggle names the rule and assigns
   shame; the fork chip shows the two readings and assigns a choice. This
   difference is the product.)

## Documented misses (current)

- Expletive subjects as whole prompts: "It was a sunny day." (expletive *it*
  has no referent and needs none — indistinguishable from a dangler without
  semantics; we stay silent only when prior content exists, so a standalone
  expletive over-flags. Accepted: rare as a full prompt.)
- Content verb + that-subject: "I think that is broken." (the content-word
  predecessor reads as a relative head; suppressed by law #2.)
- Coordinator-initial standalone clause: "and that surprised me" as an entire
  prompt.

## Roadmap (each item = one edge type, not one word list)

- **Act edges (5), general form**: statement-vs-instruction ("the intro is too
  long"), ability-vs-request ("can you…") — D3 is the special case already
  built.
- **Argument edges (3), general form**: required-slot tables for common
  predicates ("translate" wants a target language) instead of the imperative
  list.
- **Scope edges (4), general form**: negation over coordination ("don't send
  all the files").
- **Presupposition edges (6)**: bare comparatives ("better", "faster"),
  bare degrees ("soon", "a few").
- **Continuous refinement**: word-function vectors (embedding dispersion) as
  the learned estimate of *how many ways an edge tends to close* — the
  continuous version of this taxonomy, per the 2026-08-17 discussion. The
  symbolic edges stay as the explainable floor; vectors may later rank and
  extend them, clearly labeled.

## Provenance

- Founder bug, 2026-08-17: "when did that happen" produced no underline; the
  D1 detector was anchored to the first word of the prompt. The structural
  rewrite generalizes it to subject position + antecedent search, and the old
  rule survives as a corollary (first word ⇒ prior text empty ⇒ zero targets).
- Founder steering note, same date: "look at the problem structurally — where
  does ambiguity happen in the sentence structure," and: the box trains the
  skill school was supposed to teach, without naming the rules. Both are now
  laws of this document.
