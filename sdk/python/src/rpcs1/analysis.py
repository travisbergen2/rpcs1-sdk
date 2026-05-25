"""
Regime evaluation, reasoning, and warning generation.

Mirrors TypeScript analysis.ts exactly.
"""
from __future__ import annotations

from .types import (
    ReceiverProfile,
    PlatformParameters,
    RecommendInput,
    PredictedRegime,
    Confidence,
)
from .matching import OSCILLATION_THRESHOLD


# ─── Regime evaluation ────────────────────────────────────────────────────────

def evaluate_regime(profile: ReceiverProfile) -> PredictedRegime:
    """
    Evaluate predicted stability regime.

    Boundary conditions from neurotypes.json:
      - near_oscillation: TI >= 65 AND SG >= 55
      - near_overload:    TI <= 35 AND SG >= 65
      - near_freeze:      UE <= 35 AND FT >= 65
      - stable:           none of the above
    """
    if profile.TI >= 65 and profile.SG >= 55:
        return "near_oscillation"
    if profile.TI <= 35 and profile.SG >= 65:
        return "near_overload"
    if profile.UE <= 35 and profile.FT >= 65:
        return "near_freeze"
    return "stable"


# ─── Warning detection ────────────────────────────────────────────────────────

def generate_warnings(profile: ReceiverProfile, input_data: RecommendInput) -> list[str]:
    warnings: list[str] = []
    TI, SG, FT, UE, AR = profile.TI, profile.SG, profile.FT, profile.UE, profile.AR

    sg_ti_product = SG * TI
    if sg_ti_product > OSCILLATION_THRESHOLD:
        warnings.append(
            f"Oscillation risk: SG ({SG}) × TI ({TI}) = {sg_ti_product} exceeds the RPCS-1 "
            f"oscillation threshold ({OSCILLATION_THRESHOLD}). Consider reducing SG or TI."
        )

    if SG >= 60 and FT <= 30 and TI <= 30:
        warnings.append(
            f"Overload risk: High SG ({SG}) + low FT ({FT}) + low TI ({TI}) — "
            "agent may act on insufficient information. Raise FT or lower SG."
        )

    if UE <= 30 and FT >= 70:
        warnings.append(
            f"Freeze risk: Low UE ({UE}) + high FT ({FT}) — "
            "agent may hedge endlessly without acting. Lower FT or raise UE."
        )

    env = input_data.environment
    if env.stakes in ("high", "catastrophic") and AR >= 65:
        warnings.append(
            f"High stakes ({env.stakes}) + high AR ({AR}) — "
            "aggressive ambiguity resolution in a high-stakes environment increases error risk."
        )

    if env.entropy == "chaotic" and env.context_relevance == "long":
        warnings.append(
            "Environment-context mismatch: chaotic entropy calls for short TI (Matching Principle), "
            "but long context_relevance requests long integration. "
            "This configuration is structurally near the oscillation boundary."
        )

    return warnings


# ─── Reasoning string ─────────────────────────────────────────────────────────

def _describe_level(value: float) -> str:
    if value >= 70:
        return "high"
    if value >= 40:
        return "moderate"
    return "low"


def generate_reasoning(
    input_data: RecommendInput,
    profile: ReceiverProfile,
    params: PlatformParameters,
) -> str:
    TI, SG, FT, UE, AR = profile.TI, profile.SG, profile.FT, profile.UE, profile.AR
    env = input_data.environment

    return (
        f"Environment analysis: {env.entropy} entropy → Matching Principle (Pred-09-5: TI ~ 1/H) "
        f"yields TI = {TI} ({_describe_level(TI)} temporal integration window). "
        f"{env.stakes} stakes drive SG = {SG} ({_describe_level(SG)} signal gain) and "
        f"FT = {FT} ({_describe_level(FT)} filtering threshold) for basin stability. "
        f"{env.commitment_style} commitment style sets AR = {AR}; "
        f"{env.context_relevance} context relevance + entropy set UE = {UE}. "
        f"Platform mapping: temperature = {params.temperature} (from SG via 1/SG relationship), "
        f"max_tokens = {params.max_tokens} (from TI), "
        f"context_strategy = {params.context_strategy}."
    )


# ─── Principles applied ───────────────────────────────────────────────────────

def list_principles_applied(
    input_data: RecommendInput, profile: ReceiverProfile
) -> list[str]:
    principles = [
        "Matching Principle (Pred-09-5): TI ~ 1/H",
        "Basin Stability: minimize V(R,E) subject to task constraints",
        "Boundary Avoidance: stay away from oscillation/overload/freeze regimes",
    ]
    if profile.SG * profile.TI > OSCILLATION_THRESHOLD * 0.8:
        principles.append(
            "Oscillation Threshold (Paper 9 §oscillatory threshold): SG × TI < Δ_R"
        )
    if input_data.environment.stakes in ("high", "catastrophic"):
        principles.append(
            "Conservative Gating (high-stakes): raise FT, lower SG to prevent overload"
        )
    return principles


# ─── Confidence ───────────────────────────────────────────────────────────────

def assess_confidence(input_data: RecommendInput) -> Confidence:
    score = 0
    if input_data.task.domain:
        score += 1
    if input_data.task.expected_duration_per_call:
        score += 1
    score += 3  # all environment fields required

    if score >= 4:
        return "high"
    if score >= 3:
        return "medium"
    return "low"
