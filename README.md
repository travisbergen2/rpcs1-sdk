# RPCS-1 SDK — AI Agent Tuner

<!-- mcp-name: io.github.travisbergen2/rpcs1-agent-tuner -->

**Measure TI, SG, FT, UE, and AR in a configured agent, then get the runtime settings to fix it.**

RPCS-1 is a five-primitive assay battery for deployed AI agents. It turns task type, entropy, stakes, predictability, context horizon, and commitment style into a five-primitive profile, a failure-risk score, a runtime recommendation, and the next test to run.

## Repository Structure

```
rpcs1-sdk/
├── packages/core/          # TypeScript engine (@rpcs1/core): tuner + translation layer + receiver-profile intake
├── packages/web/           # Next.js app serving rpcs1.dev (tuner, translator, docs, Stripe, /mcp endpoint)
├── packages/mcp-server/    # Standalone STDIO MCP server (what Glama and MCP clients build)
├── sdk/python/             # Python SDK (pip install rpcs1)
├── skills/                 # Canonical agent skill package (HF-HATP v2.0 SKILL.md)
├── docs/                   # Architecture, deployment, launch playbook
└── .github/workflows/      # CI/CD
```

## Quick Start — Python SDK

```bash
pip install rpcs1
```

```python
from rpcs1 import recommend_params

config = recommend_params(
    task_description="Customer support agent",
    environment_entropy="dynamic",
    environment_predictability="somewhat_predictable",
    stakes="high",
    target_platform="anthropic",
)

print(config.platform_parameters.temperature)   # e.g. 0.52
print(config.predicted_regime)                  # 'stable'
print(config.reasoning)                         # cites Matching Principle
```

## Quick Start — TypeScript Core

```typescript
import { recommend } from '@rpcs1/core';

const rec = recommend({
  task: { task_summary: 'Customer support agent' },
  environment: {
    entropy: 'dynamic',
    predictability: 'somewhat_predictable',
    stakes: 'high',
    context_relevance: 'medium',
    commitment_style: 'cautious',
  },
  target_platform: 'anthropic',
});

console.log(rec.platform_parameters.temperature);
console.log(rec.predicted_regime);
```

## Development

```bash
# Install dependencies
npm ci --include=optional

# Build and test TypeScript core
npm run build --workspace=@rpcs1/core
npm run test --workspace=@rpcs1/core

# Test Python SDK
cd sdk/python
pip install -e ".[dev]"
pytest -v
```

Web environment variables are documented in [`packages/web/.env.example`](./packages/web/.env.example)
(Stripe, Resend, license signing, rate limits). MCP production controls are listed under
[Production controls](#mcp-server) below.

## The Matching Principle

The SDK implements Pred-09-5 from IMM Paper 9:

> Stable receivers in an environment with entropy H satisfy TI ~ 1/H.

High-entropy environments → short attention windows (TI ~ 10).
Low-entropy environments → long attention windows (TI ~ 90).

Every parameter recommendation traces back to this principle or the basin stability geometry (oscillation/overload/freeze boundary conditions).

## Web App

Interactive tuner: [https://rpcs1.dev](https://rpcs1.dev)

### Repaste (`/repaste`) — paste it rough, copy it right

The one-box front door. The user picks a **receiver persona** (an avatar-and-title
card for a style of reader), pastes a rough prompt, and copies back a version
aligned to that receiver. No signup, no user profiling — nothing about the user
is collected or needed.

**How it works.** Each persona in `packages/web/lib/personas.ts` is a
`ReceiverProfile` preset (the five RPCS-1 primitives on [0,100]). Picking a card
sends the vector to `POST /api/translate {tool:'rewrite', profile}`, which derives
rendering directives deterministically (`deriveRenderingDirectives` →
`rewriteForProfile` in `@rpcs1/core`). When the Vercel AI Gateway is configured
the rewrite is executed and the aligned prompt comes back; otherwise the
receiver-derived instructions are returned and shown with an honest note. The
"why?" reveal displays the mechanism one click deep. Runtime parameters remain
the Tuner's job — Repaste links to it rather than inventing numbers.

**Card claim discipline.** A persona card is a claim about how a class of
receivers reads. Cards carry exactly one of two grades, enforced by tests
(`packages/web/tests/personas.test.ts`):

- `provisional` — sketched from documented default behavior; badge shown on the
  card; `testedVersion`/`measuredDate` must be `null`. "Works well with" lines are
  pointers, not measurements.
- `measured` — backed by a frozen, versioned battery run; card must carry the
  exact model+version string and run date, and must be re-graded when the model
  updates.

There is no third state. All launch cards are `provisional`.

## MCP Server

RPCS-1 is also available as a public, anonymous, read-only MCP server:

```text
https://rpcs1.dev/mcp
```

It exposes four tools — one for tuning agents, three for translating humans:

- `recommend_agent_configuration` — diagnose an AI agent against environmental entropy,
  predictability, stakes, context horizon, and commitment style.
- `interpret` — detect ambiguity in a human message (Signature Ambiguity Framework: AR level,
  candidate readings with scores, clarifying questions).
- `normalize` — join fragmented, ellipsis-heavy input into coherent prose without changing meaning.
- `rewrite` — get rewrite instructions for a target style; the SDK's `rewriteForProfile` goes
  further and renders for a specific person's receiver profile.

### Translation Layer

> "Say what you mean. Hear what they meant."

The translation tools implement HF-HATP v2.0 — the canonical agent-facing spec lives at
[`skills/rpcs1-translation-layer/SKILL.md`](./skills/rpcs1-translation-layer/SKILL.md). In the SDK,
`scoreIntake` calibrates a five-primitive receiver profile (R̂) from a 5-item intake, and
`interpret` / `rewriteForProfile` consume it so output is tuned to the person, not a lumped style.

### Tuner examples

The first useful call is a support copilot under live pressure:

```text
Use recommend_agent_configuration to diagnose my support copilot.

Task: refund and billing dispute triage
Environment: dynamic, somewhat_predictable, high stakes
Context relevance: medium
Commitment style: cautious
Target platform: anthropic
```

The output should lead with the five-primitive profile, failure-risk score, predicted regime,
runtime posture, and next test to run.

The second useful call is a coding agent in a changing repository:

```text
Use recommend_agent_configuration to diagnose my coding agent.

Task: inspect a changing repository, edit files, run tests, and open a pull request
Environment: moderate, somewhat_predictable, medium stakes
Context relevance: long
Commitment style: balanced
Target platform: openai
```

The output should still lead with the five-primitive profile, failure-risk score, predicted regime,
runtime posture, and next test to run.

Connection details and client compatibility notes are available at
[https://rpcs1.dev/docs/mcp](https://rpcs1.dev/docs/mcp).
Practical coding, support, and research examples are available at
[https://rpcs1.dev/docs/examples](https://rpcs1.dev/docs/examples).

Hyperagent uses the fixed public OAuth client `hyperagent-rpcs1` with PKCE and the registered
callback `https://hyperagent.com/api/mcp-servers/callback`. No client secret is required.

The MCP surface intentionally wraps the existing deterministic recommendation engine. Broader
communication, market, and decision-analysis tools should be added only after their scoring
contracts are implemented and tested in the core package.

Discovery metadata:

- OpenAPI: [https://rpcs1.dev/openapi.json](https://rpcs1.dev/openapi.json)
- LLM overview: [https://rpcs1.dev/llms.txt](https://rpcs1.dev/llms.txt)
- MCP Registry manifest: [`server.json`](./server.json)

Production controls:

- `MCP_HOURLY_LIMIT` controls per-instance MCP throttling (default: `120` requests per IP/hour).
- `MCP_MAX_BODY_BYTES` limits request bodies (default: `65536` bytes).
- `MCP_ALLOWED_HOSTS` is a comma-separated production host allowlist.
- `MCP_OAUTH_JWT_SECRET` signs short-lived OAuth authorization codes and access tokens.
- `/api/health` reports deployment and MCP readiness metadata.

For globally consistent abuse protection across Vercel instances, configure a Vercel Firewall
rate-limit rule for `/mcp`. The in-process limiter is defense in depth, not a distributed quota.

Glama Docker checks should build and launch the local STDIO server, not connect to the hosted
`https://rpcs1.dev/mcp` endpoint. Use this build spec:

```json
{
  "buildSteps": [
    "npm ci --include=optional",
    "npm run build --workspace=@rpcs1/core",
    "npm run build --workspace=@rpcs1/mcp-server"
  ],
  "cmdArguments": [
    "mcp-proxy",
    "--",
    "node",
    "packages/mcp-server/dist/index.js"
  ],
  "environmentVariablesJsonSchema": {
    "type": "object",
    "properties": {},
    "required": []
  },
  "placeholderArguments": {}
}
```

## License

MIT
