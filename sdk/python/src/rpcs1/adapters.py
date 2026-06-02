"""
Adapters for turning RPCS-1 recommendations into integration-friendly payloads.
"""
from __future__ import annotations

from typing import Any

from .types import Recommendation


def to_runtime_config(recommendation: Recommendation) -> dict[str, Any]:
    """
    Flatten a Recommendation into a simple runtime payload.

    This is useful for EA bridges, dashboards, web APIs, and logging code that
    should not need to know the nested Pydantic model structure.
    """
    profile = recommendation.receiver_profile
    params = recommendation.platform_parameters

    return {
        "regime": recommendation.predicted_regime,
        "confidence": recommendation.confidence,
        "reasoning": recommendation.reasoning,
        "warnings": recommendation.warnings,
        "TI": profile.TI,
        "SG": profile.SG,
        "FT": profile.FT,
        "UE": profile.UE,
        "AR": profile.AR,
        "temperature": params.temperature,
        "top_p": params.top_p,
        "max_tokens": params.max_tokens,
        "model_recommendation": params.model_recommendation,
        "tool_use_strategy": params.tool_use_strategy,
        "retry_strategy": params.retry_strategy,
        "context_strategy": params.context_strategy,
    }
