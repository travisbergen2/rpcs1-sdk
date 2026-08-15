# RPCS-1 SDK — AI Agent Tuner

<!-- mcp-name: io.github.travisbergen2/rpcs1-agent-tuner -->

**Start with the free tuner: find your AI agent’s likely failure mode, get runtime settings to try, and validate them with a harder case.**

RPCS-1 helps teams make agent settings deliberate rather than guessed. Describe the task, change rate, predictability, stakes, relevant context horizon, and commitment style; it returns a five-primitive profile, a runtime recommendation, and a next test. The suite also includes SendRight for catching ambiguous prompts before handoff and the Translation Bridge for profile-aware communication rendering.

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

The web app deploys to Vercel on Node 24 (region `iad1`); pushes to `main` trigger the production deployment.

## The Matching Principle

The SDK implements Pred-09-5 from IMM Paper 9:

> Stable receivers in an environment with entropy H satisfy TI ~ 1/H.

High-entropy environments → short attention windows (TI ~ 10).
Low-entropy environments → long attention windows (TI ~ 90).

Every parameter recommendation traces back to this principle or the basin stability geometry (oscillation/overload/freeze boundary conditions).

## Web App

- Free Tuner: [https://rpcs1.dev/tuner](https://rpcs1.dev/tuner)
- SendRight: [https://rpcs1.dev/send](https://rpcs1.dev/send)
- Translation Bridge: [https://rpcs1.dev/translator](https://rpcs1.dev/translator)
- Calibrate a communication-preference profile: [https://rpcs1.dev/calibrate](https://rpcs1.dev/calibrate)

The site can also explain the same product facts in technical, executive, plain-language, or literal-and-precise registers. The explanation changes; pricing, deliverables, and limitations do not.

## SendRight (Interpretation Mirror + Hand-off)

SendRight is the type-and-send front door: type a prompt the way you'd say it
out loud, see the readings it actually supports, lock in the one you meant, and
hand it to your own model app with one click.

**Modules (packages/core):**

- `mirror(text)` — deterministic fork detectors (no ML, no API calls). Returns
  `{ clean, readings[], ambiguousSpans[] }`. Detectors: compare-or-choose
  ("X or Y?" questions without an explicit verb), grouping forks ("A and B or C"),
  scope forks ("only ... and ..."), dangling pronouns, bare objects ("fix it"),
  external references ("the above"). **Contract: silent on clean prompts** —
  zero-fork controls in `tests/mirror.test.ts` enforce it. Pure function,
  callable from any front end (web box, NL2Build, CLI).
- `applyReading(text, clarifier)` — appends the chosen reading's clarifier so
  the locked interpretation travels with the prompt.
- `buildHandoff(vendor, prompt)` / `listVendors()` — per-vendor capability
  table for opening the user's own model app with the prompt pre-filled.
  Prefill URL parameters are **undocumented vendor behavior and churn without
  notice**; each entry carries a `verified` date and must be re-checked at
  release. Verified 2026-07-25: ChatGPT, Claude, Perplexity, Grok support URL
  prefill; Gemini and Copilot are clipboard-fallback only. Logged-out users may
  lose the prefill at login. All vendors degrade gracefully to clipboard.

**Web:** `/send` (packages/web/app/send) renders the box via
`components/SendBox.tsx` — mirror runs client-side (debounced, zero network);
the hand-off happens in the user's own app. SendRight never makes the model
call and never sees the answer.

**Feasibility boundary (honest scope):** reasoning-stream digests and
mid-generation stop/realign are only possible where rpcs1 itself owns the API
call (the fan-out / power-user mode, not yet shipped). They are structurally
impossible in vendor chat UIs and via the MCP surface — SendRight's hand-off
path intentionally trades those away for zero keys, zero cost, and zero data
custody.

## MCP Server

RPCS-1 is also available as a public, anonymous, read-only MCP server:

```text
https://rpcs1.dev/mcp
```

It exposes seven read-only tools across three families:

- `recommend_agent_configuration` — diagnose an AI agent against environmental entropy,
  predictability, stakes, context horizon, and commitment style; receive runtime settings to try and a next test.
- `interpret`, `normalize`, and `rewrite` — detect ambiguity, turn fragmented text into coherent prose,
  and return style-specific rewrite instructions.
- `calibrate_profile`, `prepare_prompt`, and `render_reply` — create a continuous communication-preference
  profile, recover intended meaning before an action, and render a reply for that profile.

### Translation Layer

> "Say what you mean. Hear what they meant."

The Translation Bridge treats the profile as a transportable parameter, not a category label. The five-question
Calibrate flow measures communication preferences for rendering only; it is not a psychological assessment or diagnosis.
`prepare_prompt` / `render_reply` use that profile on the inbound and outbound sides of an interaction. The canonical
agent-facing specification lives at [`skills/rpcs1-translation-layer/SKILL.md`](./skills/rpcs1-translation-layer/SKILL.md).

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

The MCP surface exposes the deterministic agent-tuning workflow alongside read-only translation and
per-user rendering tools. New tools should be added only after their scoring or behavior contracts are
implemented and tested in the core package.

Discovery metadata:

- OpenAPI: [https://rpcs1.dev/openapi.json](https://rpcs1.dev/openapi.json)
- LLM overview: [https://rpcs1.dev/llms.txt](https://rpcs1.dev/llms.txt)
- MCP Registry manifest: [`server.json`](./server.json)

Production controls:

- `MCP_HOURLY_LIMIT` controls per-instance MCP throttling (default: `120` requests per IP/hour).
- `MCP_MAX_BODY_BYTES` limits request bodies (default: `65536` bytes).
- `MCP_ALLOWED_HOSTS` is a comma-separated production host allowlist.
- `MCP_ALLOWED_ORIGINS` is an optional comma-separated browser-origin allowlist. Leave it blank to reject cross-origin browser requests.
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
