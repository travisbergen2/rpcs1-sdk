"""
Top-level recommendation function for the RPCS-1 Python SDK.

Usage:
    from rpcs1 import recommend_params

    config = recommend_params(
        task_description="Customer support agent handling refund requests",
        environment_entropy="dynamic",
        environment_predictability="somewhat_predictable",
        stakes="high",
        context_relevance="medium",
        commitment_style="cautious",
        target_platform="anthropic",
    )
    print(config.platform_parameters.temperature)   # e.g. 0.52
    print(config.receiver_profile.TI)               # e.g. 30
    print(config.predicted_regime)                  # 'stable'
    print(config.reasoning)                         # cites Matching Principle
"""
from __future__ import annotations

from typing import Literal

from .types import (
    AgentEnvironment,
    TaskDescriptor,
    RecommendInput,
    Recommendation,
)
from .primitives import compute_receiver_profile
from .platforms import map_to_parameters
from .analysis import (
    evaluate_regime,
    generate_reasoning,
    generate_warnings,
    list_principles_applied,
    assess_confidence,
)


def recommend_params(
    task_description: str,
    environment_entropy: Literal["stable", "moderate", "dynamic", "chaotic"],
    environment_predictability: Literal[
        "highly_predictable", "somewhat_predictable", "unpredictable"
    ],
    stakes: Literal["low", "medium", "high", "catastrophic"],
    context_relevance: Literal["short", "medium", "long"] = "medium",
    commitment_style: Literal["decisive", "balanced", "cautious"] = "balanced",
    target_platform: Literal["anthropic", "openai", "open_source", "generic"] = "generic",
    domain: str | None = None,
    expected_duration_per_call: Literal["short", "medium", "long"] | None = None,
) -> Recommendation:
    """
    Compute parameter recommendations for an AI agent given task and environment.

    Returns a Recommendation with:
    - receiver_profile: TI, SG, FT, UE, AR primitives [0–100]
    - platform_parameters: temperature, max_tokens, model, tool strategy, etc.
    - predicted_regime: 'stable' | 'near_oscillation' | 'near_overload' | 'near_freeze'
    - reasoning: human-readable explanation citing IMM principles
    - warnings: list of risk flags
    - imm_principles_applied: principles used (Matching Principle, Basin Stability, etc.)
    - confidence: 'high' | 'medium' | 'low'

    All outputs are deterministic for the same inputs. No ML, no randomness.
    See https://rpcs1.dev/docs for the full IMM theoretical foundation.
    """
    input_data = RecommendInput(
        task=TaskDescriptor(
            task_summary=task_description,
            domain=domain,
            expected_duration_per_call=expected_duration_per_call,
        ),
        environment=AgentEnvironment(
            entropy=environment_entropy,
            predictability=environment_predictability,
            stakes=stakes,
            context_relevance=context_relevance,
            commitment_style=commitment_style,
        ),
        target_platform=target_platform,
    )

    profile = compute_receiver_profile(input_data.environment, input_data.task)
    params = map_to_parameters(profile, target_platform)
    regime = evaluate_regime(profile)
    reasoning = generate_reasoning(input_data, profile, params)
    warnings = generate_warnings(profile, input_data)
    principles = list_principles_applied(input_data, profile)
    confidence = assess_confidence(input_data)

    return Recommendation(
        receiver_profile=profile,
        platform_parameters=params,
        predicted_regime=regime,
        reasoning=reasoning,
        warnings=warnings,
        imm_principles_applied=principles,
        confidence=confidence,
    )


def recommend_from_input(input_data: RecommendInput) -> Recommendation:
    """
    Lower-level entry point accepting a fully-constructed RecommendInput.
    Useful when building web app integrations or testing parity with TypeScript.
    """
    profile = compute_receiver_profile(input_data.environment, input_data.task)
    params = map_to_parameters(profile, input_data.target_platform)
    regime = evaluate_regime(profile)
    reasoning = generate_reasoning(input_data, profile, params)
    warnings = generate_warnings(profile, input_data)
    principles = list_principles_applied(input_data, profile)
    confidence = assess_confidence(input_data)

    return Recommendation(
        receiver_profile=profile,
        platform_parameters=params,
        predicted_regime=regime,
        reasoning=reasoning,
        warnings=warnings,
        imm_principles_applied=principles,
        confidence=confidence,
    )
