# RPCS-1 SDK — AI Agent Tuner

**Configure AI agents that don't oscillate, overload, or freeze.**

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

Interactive tuner: [https://rpcs1.dev](https://rpcs1.dev) *(Phase 2)*

## License

MIT
