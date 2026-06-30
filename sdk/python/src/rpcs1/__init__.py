"""
RPCS-1 Agent Tuner & Translator — Python SDK.

Quick start:
    from rpcs1 import recommend_params
    from rpcs1.translator import interpret

    config = recommend_params(...)
    result = interpret("I'm fine")
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

__version__ = "0.2.1"
