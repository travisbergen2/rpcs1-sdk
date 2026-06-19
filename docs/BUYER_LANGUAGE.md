# RPCS1 Buyer Language Guide

Updated: 2026-06-19

## Primary Wedge

Lead with AI quality for customer support and agent operations. The first buyers
most likely to recognize the problem are:

- CX and support operations leaders responsible for automated resolution and escalation.
- AI product and support-engineering teams shipping customer-facing agents.
- QA, evaluation, and governance teams responsible for consistency, policy adherence, and regressions.

## How Buyers Describe The Problem

They usually say:

- inconsistent answers across similar cases
- quality regressions after release
- poor grounding or missed policy context
- unnecessary escalations and handoffs
- hallucinated or unsupported actions
- low visibility into why an agent failed
- difficulty turning production traces into useful evals
- uncertainty about what to change when an eval fails

They usually do not lead with:

- receiver primitives
- temporal integration
- signal gain
- entropy matching
- sampling-control theory
- oscillation, overload, or freeze without a plain-English translation

## Messaging Order

Use this order on public surfaces:

1. Buyer outcome: protect quality, resolution, consistency, or deployment confidence.
2. Recognizable symptom: loops, weak grounding, over-refusal, unnecessary escalation.
3. Product action: configuration assessment, failure-risk diagnosis, recommended runtime posture.
4. Validation: what should be measured or re-tested after the change.
5. Mechanism: RPCS-1 receiver dynamics and the five primitives.
6. Research status: hypothesis, proposed assay, or validated result stated precisely.

## Translation Table

| Internal term | Buyer-facing term |
|---|---|
| Agent tuner | AI configuration assessment |
| Oscillation | consistency drift, repeated tools, looping |
| Overload | weak grounding, hallucinated action, policy risk |
| Freeze | over-refusal, stalled resolution, unnecessary escalation |
| Receiver profile | operating profile or runtime posture |
| Matching | fit between configuration and operating conditions |
| Platform parameters | implementation settings |
| Synthetic benchmark | directional simulation |
| Closed-loop validation | change the configuration, rerun evals, verify behavior |
| Assay battery | behavioral evaluation protocol |

## Recommended One-Liner

RPCS1 reviews whether an AI agent is configured for the conditions it actually
faces, flags likely quality risks, and recommends what to change and test next.

## Homepage Promise

Catch AI quality failures before customers do.

Supporting copy:

Review whether your agent's configuration fits real operating conditions: case
complexity, policy ambiguity, risk, context, and handoff needs. Get a clear
failure-risk diagnosis and recommended runtime posture.

## Paper 17 Boundary

Paper 17 strengthens the product story around measurement and verification, but
the site must distinguish specification from completed evidence.

Defensible language:

- Paper 17 specifies a behavioral evaluation protocol for configured agents.
- The protocol includes contamination, prompt-robustness, stochastic-decoding,
  and position-bias validity gates.
- It defines a non-circular closed-loop test: measure, change configuration,
  measure again.
- Until the battery is run and reliability targets are met, outputs remain
  research-grade estimates.

Do not say:

- the five primitives have been validated in LLM agents
- the Paper 17 battery has already profiled a model
- the tuner has proven production quality improvements

## Research Sources

Official market language reviewed on 2026-06-19:

- [Intercom Fin](https://www.intercom.com/fin): customer experience and service outcomes.
- [Zendesk AI](https://www.zendesk.com/service/ai/): automated resolutions, trusted knowledge,
  service-team enablement, and quality standards.
- [Observe.AI](https://www.observe.ai/): speed, accuracy, consistency, resolutions, and operational visibility.
- [Braintrust](https://www.braintrust.dev/): production traces, evals, regressions, and shipping quality AI at scale.
- [LangSmith Observability](https://www.langchain.com/langsmith): finding failures, production visibility,
  and understanding what agents are doing.

The wording above is adapted to RPCS1's actual capabilities. It should not imply
that the current tuner performs trace ingestion, automated QA, or the full Paper 17 battery.
