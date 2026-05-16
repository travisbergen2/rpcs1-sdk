"""
Phase 1 acceptance tests — Python SDK.

Mirror the TypeScript test cases in packages/core/tests/recommend.test.ts.
When both test suites pass with the same expectations, parity is confirmed.
"""
import pytest
from rpcs1 import recommend_params


def test_high_entropy_high_stakes_short_ti():
    """chaotic + high stakes → TI < 40, FT > 50, stable regime."""
    result = recommend_params(
        task_description="Customer support agent handling refund requests",
        environment_entropy="chaotic",
        environment_predictability="unpredictable",
        stakes="high",
        context_relevance="short",
        commitment_style="cautious",
        target_platform="anthropic",
    )
    assert result.receiver_profile.TI < 40, f"Expected TI < 40, got {result.receiver_profile.TI}"
    assert result.receiver_profile.TI < 20, f"Expected TI < 20 for chaotic, got {result.receiver_profile.TI}"
    assert result.receiver_profile.FT > 50, f"Expected FT > 50 for high stakes, got {result.receiver_profile.FT}"
    assert result.predicted_regime == "stable", f"Expected stable, got {result.predicted_regime}"
    assert any("Matching Principle" in p for p in result.imm_principles_applied)


def test_low_entropy_low_stakes_high_ti():
    """stable + low stakes → TI > 60, SG > 50, stable regime."""
    result = recommend_params(
        task_description="Creative writing assistant",
        environment_entropy="stable",
        environment_predictability="somewhat_predictable",
        stakes="low",
        context_relevance="long",
        commitment_style="decisive",
        target_platform="anthropic",
        domain="creative",
    )
    assert result.receiver_profile.TI > 60, f"Expected TI > 60, got {result.receiver_profile.TI}"
    assert result.receiver_profile.SG > 50, f"Expected SG > 50, got {result.receiver_profile.SG}"
    assert result.predicted_regime == "stable"
    # Long context + low entropy → low UE
    assert result.receiver_profile.UE < 50, f"Expected UE < 50, got {result.receiver_profile.UE}"


def test_oscillation_warning_chaotic_long_context():
    """chaotic + long context → warns about mismatch."""
    result = recommend_params(
        task_description="Deliberative planning agent",
        environment_entropy="chaotic",
        environment_predictability="unpredictable",
        stakes="high",
        context_relevance="long",
        commitment_style="cautious",
        target_platform="anthropic",
    )
    has_warning = any(
        "oscillation" in w.lower() or "mismatch" in w.lower()
        for w in result.warnings
    )
    assert has_warning, f"Expected oscillation/mismatch warning, got: {result.warnings}"


def test_catastrophic_stakes_explicit_confirmation():
    """catastrophic stakes + cautious → explicit_confirmation tool strategy, high FT."""
    result = recommend_params(
        task_description="Autonomous medical triage agent",
        environment_entropy="moderate",
        environment_predictability="somewhat_predictable",
        stakes="catastrophic",
        context_relevance="medium",
        commitment_style="cautious",
        target_platform="anthropic",
        domain="medical",
    )
    assert result.receiver_profile.FT > 70, f"Expected FT > 70, got {result.receiver_profile.FT}"
    assert result.platform_parameters.tool_use_strategy == "explicit_confirmation"
    assert result.confidence == "high"  # has domain


def test_decisive_stable_aggressive_tool_strategy():
    """stable + decisive + low stakes → aggressive tool strategy, high AR."""
    result = recommend_params(
        task_description="CI pipeline automation agent",
        environment_entropy="stable",
        environment_predictability="highly_predictable",
        stakes="low",
        context_relevance="short",
        commitment_style="decisive",
        target_platform="openai",
        domain="devops",
    )
    assert result.receiver_profile.AR > 60, f"Expected AR > 60, got {result.receiver_profile.AR}"
    assert result.platform_parameters.tool_use_strategy == "aggressive"


def test_generic_platform_no_model():
    """generic platform → no model recommendation."""
    result = recommend_params(
        task_description="Generic data extraction agent",
        environment_entropy="moderate",
        environment_predictability="somewhat_predictable",
        stakes="medium",
        target_platform="generic",
    )
    assert result.platform_parameters.model_recommendation is None


def test_anthropic_platform_has_model():
    """anthropic platform → model recommendation present."""
    result = recommend_params(
        task_description="Research summarization agent",
        environment_entropy="moderate",
        environment_predictability="somewhat_predictable",
        stakes="medium",
        context_relevance="long",
        target_platform="anthropic",
        domain="research",
    )
    assert result.platform_parameters.model_recommendation is not None
    assert isinstance(result.platform_parameters.model_recommendation, str)


def test_reasoning_always_cites_matching_principle():
    """Reasoning string always references Matching Principle and TI."""
    result = recommend_params(
        task_description="Any agent",
        environment_entropy="dynamic",
        environment_predictability="unpredictable",
        stakes="medium",
        target_platform="anthropic",
    )
    assert "Matching Principle" in result.reasoning
    assert "TI" in result.reasoning


def test_all_primitives_in_range():
    """All five primitives must be in [0, 100] for any valid input."""
    result = recommend_params(
        task_description="Edge case test",
        environment_entropy="chaotic",
        environment_predictability="unpredictable",
        stakes="catastrophic",
        context_relevance="long",
        commitment_style="cautious",
        target_platform="anthropic",
    )
    for name in ["TI", "SG", "FT", "UE", "AR"]:
        val = getattr(result.receiver_profile, name)
        assert 0 <= val <= 100, f"{name} = {val} is out of [0, 100]"


def test_openai_temperature_within_range():
    """openai temperature must be within [0.0, 2.0]."""
    result = recommend_params(
        task_description="Agent",
        environment_entropy="stable",
        environment_predictability="highly_predictable",
        stakes="low",
        target_platform="openai",
    )
    assert 0.0 <= result.platform_parameters.temperature <= 2.0


def test_confidence_high_with_domain():
    """confidence is 'high' when domain is provided."""
    result = recommend_params(
        task_description="Agent with domain",
        environment_entropy="moderate",
        environment_predictability="somewhat_predictable",
        stakes="medium",
        target_platform="generic",
        domain="fintech",
    )
    assert result.confidence == "high"


def test_confidence_medium_without_domain():
    """confidence is 'medium' when no domain or duration provided."""
    result = recommend_params(
        task_description="Generic agent",
        environment_entropy="moderate",
        environment_predictability="somewhat_predictable",
        stakes="medium",
        target_platform="generic",
    )
    assert result.confidence == "medium"
