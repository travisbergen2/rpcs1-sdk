# rpcs1 — AI Agent Parameter Tuner

**Configure AI agents that don't oscillate, overload, or freeze.**

Stop debugging agent failures case-by-case. The RPCS-1 SDK translates your agent's task and environment into specific platform parameters — grounded in receiver dynamics from cognitive systems research.

Built on the matching principle: agents in fast-changing environments need short attention windows; agents in stable environments benefit from longer integration.

## Installation

```bash
pip install rpcs1
# With Anthropic integration:
pip install rpcs1[anthropic]
# With OpenAI integration:
pip install rpcs1[openai]
```

## Quick Start

```python
from rpcs1 import recommend_params

config = recommend_params(
    task_description="Customer support agent handling refund requests",
    environment_entropy="dynamic",           # stable | moderate | dynamic | chaotic
    environment_predictability="somewhat_predictable",
    stakes="high",                           # low | medium | high | catastrophic
    context_relevance="medium",              # short | medium | long
    commitment_style="cautious",             # decisive | balanced | cautious
    target_platform="anthropic",             # anthropic | openai | open_source | generic
    domain="customer_support",              # optional
)

print(config.platform_parameters.temperature)        # e.g. 0.52
print(config.platform_parameters.model_recommendation)  # e.g. 'claude-sonnet-4-6'
print(config.predicted_regime)                       # 'stable'
print(config.reasoning)                              # cites Matching Principle (Pred-09-5)
```

## The Five Receiver Primitives

Every recommendation is driven by five receiver primitives from RPCS-1:

| Primitive | Name | What it controls |
|---|---|---|
| **TI** | Temporal Integration | How much history to integrate (context window strategy) |
| **SG** | Signal Gain | How strongly to amplify signals (temperature) |
| **FT** | Filtering Threshold | How conservatively to gate action (tool use strategy) |
| **UE** | Update Elasticity | How readily to revise the model (retry strategy) |
| **AR** | Ambiguity Resolution | How aggressively to resolve uncertainty |

## Stability Regimes

The SDK predicts and warns about four stability regimes:

- **stable** — balanced operation, well-matched to environment
- **near_oscillation** — high TI + high SG → agent revisits decisions, won't commit
- **near_overload** — low TI + high SG → agent acts on insufficient information
- **near_freeze** — low UE + high FT → agent hedges endlessly, won't act

## Anthropic Integration

```python
from rpcs1 import recommend_params
from rpcs1.integrations.anthropic import to_anthropic_params
import anthropic

rec = recommend_params(
    task_description="Medical triage assistant",
    environment_entropy="moderate",
    environment_predictability="somewhat_predictable",
    stakes="catastrophic",
    commitment_style="cautious",
    target_platform="anthropic",
)

params = to_anthropic_params(
    rec,
    system_prompt="You are a medical intake assistant.",
    user_message="I've had chest pain for an hour.",
)

client = anthropic.Anthropic()
message = client.messages.create(**params)
```

## Theoretical Foundation

The RPCS-1 SDK implements the matching principle (Pred-09-5) from IMM Paper 9:

> Stable receivers in an environment with entropy H satisfy TI ~ 1/H.

This translates directly: agents in chaotic environments need short attention windows (low TI, frequent grounding); agents in stable environments benefit from long integration (high TI, large context windows).

All parameter recommendations are deterministic, explainable, and traceable to specific IMM principles. No ML models, no black-box recommendations.

## License

MIT — see LICENSE file.

Web app and full documentation: [https://rpcs1.dev](https://rpcs1.dev)
