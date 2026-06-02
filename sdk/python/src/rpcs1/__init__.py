"""
RPCS-1 Agent Tuner — Python SDK.

Quick start:
    from rpcs1 import recommend_params

    config = recommend_params(
        task_description="Customer support agent",
        environment_entropy="dynamic",
        environment_predictability="somewhat_predictable",
        stakes="high",
        target_platform="anthropic",
    )
    print(config.platform_parameters.temperature)
    print(config.predicted_regime)
    print(config.reasoning)
"""

from .recommend import recommend_params, recommend_from_input
from .adapters import to_runtime_config
from .types import (
    AgentEnvironment,
    TaskDescriptor,
    RecommendInput,
    ReceiverProfile,
    PlatformParameters,
    Recommendation,
)

__all__ = [
    "recommend_params",
    "recommend_from_input",
    "to_runtime_config",
    "AgentEnvironment",
    "TaskDescriptor",
    "RecommendInput",
    "ReceiverProfile",
    "PlatformParameters",
    "Recommendation",
]

__version__ = "0.1.0"
