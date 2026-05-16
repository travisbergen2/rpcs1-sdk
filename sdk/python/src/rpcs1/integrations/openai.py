"""
OpenAI-specific integration.

Converts an RPCS-1 Recommendation into ready-to-use OpenAI API parameters.

Requires: pip install rpcs1[openai]
"""
from __future__ import annotations

from typing import Any

from ..types import Recommendation


def to_openai_params(
    rec: Recommendation,
    system_prompt: str,
    user_message: str,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Convert an RPCS-1 Recommendation into ready-to-use OpenAI API parameters.

    Example:
        from rpcs1 import recommend_params
        from rpcs1.integrations.openai import to_openai_params
        from openai import OpenAI

        rec = recommend_params(
            task_description="Research summarization",
            environment_entropy="stable",
            environment_predictability="highly_predictable",
            stakes="medium",
            target_platform="openai",
        )
        params = to_openai_params(rec, "You are a helpful assistant.", "Summarize this paper.")
        client = OpenAI()
        response = client.chat.completions.create(**params)
    """
    model_to_use = (
        model
        or rec.platform_parameters.model_recommendation
        or "gpt-4o"
    )

    full_system_prompt = system_prompt
    for addition in (rec.platform_parameters.system_prompt_additions or []):
        full_system_prompt += f"\n\n{addition}"

    params: dict[str, Any] = {
        "model": model_to_use,
        "max_tokens": rec.platform_parameters.max_tokens,
        "temperature": rec.platform_parameters.temperature,
        "messages": [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": user_message},
        ],
    }

    if rec.platform_parameters.top_p is not None:
        params["top_p"] = rec.platform_parameters.top_p

    return params
