# RPCS-1 SDK — AI Agent Tuner

<!-- mcp-name: io.github.travisbergen2/rpcs1-agent-tuner -->

**Diagnose whether deployed AI agents are matched to their operating environment.**

A configuration framework for AI agents that translates environmental characteristics (entropy, stakes, predictability) into specific LLM parameter recommendations — grounded in RPCS-1 receiver dynamics.

## Repository Structure

```
rpcs1-sdk/
├── packages/core/          # TypeScript recommendation engine (@rpcs1/core)
├── sdk/python/             # Python SDK (pip install rpcs1)
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
# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Build and test TypeScript core
pnpm --filter @rpcs1/core build
pnpm --filter @rpcs1/core test

# Test Python SDK
cd sdk/python
pip install -e ".[dev]"
pytest -v
```

## The Matching Principle

The SDK implements Pred-09-5 from IMM Paper 9:

> Stable receivers in an environment with entropy H satisfy TI ~ 1/H.

High-entropy environments → short attention windows (TI ~ 10).
Low-entropy environments → long attention windows (TI ~ 90).

Every parameter recommendation traces back to this principle or the basin stability geometry (oscillation/overload/freeze boundary conditions).

## Web App

Interactive tuner: [https://rpcs1.dev](https://rpcs1.dev)

## MCP Server

RPCS-1 is also available as a public, anonymous, read-only MCP server:

```text
https://rpcs1.dev/mcp
```

It exposes one focused tool:

- `recommend_agent_configuration` — use when designing, tuning, or diagnosing an AI agent
  against environmental entropy, predictability, stakes, context horizon, and commitment style.

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

## License

MIT
