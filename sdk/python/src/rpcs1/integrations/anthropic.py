"""
Anthropic-specific integration.

Converts an RPCS-1 Recommendation into ready-to-use Anthropic API parameters.

Requires: pip install rpcs1[anthropic]
"""
from __future__ import annotations

from typing import Any

from ..types import Recommendation


def to_anthropic_params(
    rec: Recommendation,
    system_prompt: str,
    user_message: str,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Convert an RPCS-1 Recommendation into ready-to-use Anthropic API parameters.

    Example:
        from rpcs1 import recommend_params
        from rpcs1.integrations.anthropic import to_anthropic_params
        import anthropic

        rec = recommend_params(
            task_description="Customer support",
            environment_entropy="dynamic",
            environment_predictability="somewhat_predictable",
            stakes="high",
            target_platform="anthropic",
        )
        params = to_anthropic_params(rec, system_prompt="You are a helpful assistant.", user_message="Help me.")
        client = anthropic.Anthropic()
        message = client.messages.create(**params)
    """
    model_to_use = (
        model
        or rec.platform_parameters.model_recommendation
        or "claude-sonnet-4-6"
    )

    full_system_prompt = system_prompt
    for addition in (rec.platform_parameters.system_prompt_additions or []):
        full_system_prompt += f"\n\n{addition}"

    params: dict[str, Any] = {
        "model": model_to_use,
        "max_tokens": rec.platform_parameters.max_tokens,
        "temperature": rec.platform_parameters.temperature,
        "system": full_system_prompt,
        "messages": [{"role": "user", "content": user_message}],
    }

    if rec.platform_parameters.top_p is not None:
        params["top_p"] = rec.platform_parameters.top_p

    return params
