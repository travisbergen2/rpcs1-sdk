"""
Five RPCS-1 receiver primitives computed from environment + task.

Mirrors TypeScript primitives.ts exactly. All computations are deterministic
lookup/weighted calculations — no ML, no randomness.
"""
from __future__ import annotations

from .types import (
    AgentEnvironment,
    TaskDescriptor,
    ReceiverProfile,
    Stakes,
    CommitmentStyle,
    ContextRelevance,
)
from .matching import matching_principle_ti, entropy_to_scalar, predictability_to_scalar

# ─── SG: Signal Gain ──────────────────────────────────────────────────────────

_SG_STAKES_BASE: dict[str, float] = {
    "low":          70.0,
    "medium":       55.0,
    "high":         35.0,
    "catastrophic": 20.0,
}


def compute_sg(stakes: Stakes, predictability: float) -> float:
    base = _SG_STAKES_BASE[stakes]
    adjustment = round((predictability - 0.5) * 20)
    return min(100.0, max(0.0, base + adjustment))


# ─── FT: Filtering Threshold ──────────────────────────────────────────────────

_FT_STAKES_BASE: dict[str, float] = {
    "low":          25.0,
    "medium":       40.0,
    "high":         60.0,
    "catastrophic": 80.0,
}

_FT_COMMITMENT_DELTA: dict[str, float] = {
    "decisive": -10.0,
    "balanced":   0.0,
    "cautious":  15.0,
}


def compute_ft(stakes: Stakes, commitment_style: CommitmentStyle) -> float:
    base = _FT_STAKES_BASE[stakes]
    delta = _FT_COMMITMENT_DELTA[commitment_style]
    return min(100.0, max(0.0, base + delta))


# ─── UE: Update Elasticity ────────────────────────────────────────────────────

_UE_CONTEXT_DELTA: dict[str, float] = {
    "short":  15.0,
    "medium":  0.0,
    "long":  -15.0,
}


def compute_ue(H: float, context_relevance: ContextRelevance) -> float:
    base = round(20 + H * 60)
    delta = _UE_CONTEXT_DELTA[context_relevance]
    return min(100.0, max(0.0, base + delta))


# ─── AR: Ambiguity Resolution ─────────────────────────────────────────────────

_AR_COMMITMENT_BASE: dict[str, float] = {
    "decisive": 70.0,
    "balanced": 50.0,
    "cautious": 30.0,
}

_AR_STAKES_DELTA: dict[str, float] = {
    "low":           5.0,
    "medium":        0.0,
    "high":        -10.0,
    "catastrophic": -20.0,
}


def compute_ar(commitment_style: CommitmentStyle, stakes: Stakes) -> float:
    base = _AR_COMMITMENT_BASE[commitment_style]
    delta = _AR_STAKES_DELTA[stakes]
    return min(100.0, max(0.0, base + delta))


# ─── Top-level ────────────────────────────────────────────────────────────────

def compute_receiver_profile(
    environment: AgentEnvironment,
    task: TaskDescriptor,  # noqa: ARG001 — reserved for future task-specific adjustments
) -> ReceiverProfile:
    H = entropy_to_scalar(environment.entropy)
    P = predictability_to_scalar(environment.predictability)

    TI = matching_principle_ti(H)
    SG = compute_sg(environment.stakes, P)
    FT = compute_ft(environment.stakes, environment.commitment_style)
    UE = compute_ue(H, environment.context_relevance)
    AR = compute_ar(environment.commitment_style, environment.stakes)

    return ReceiverProfile(TI=TI, SG=SG, FT=FT, UE=UE, AR=AR)
