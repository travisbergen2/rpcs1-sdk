"""
RPCS-1 / HF-HATP v1.9 scoring engine.

Implements the Signature Ambiguity Framework: scoring function,
AR scale decision logic, risk-based calibration, and adaptive learning.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

RiskCategory = Literal["casual", "advice", "high-stakes", "safety-critical"]

RISK_THRESHOLDS: dict[RiskCategory, float] = {
    "casual": 0.15,
    "advice": 0.30,
    "high-stakes": 0.60,
    "safety-critical": 0.85,
}

REFERENCE_WEIGHTS = {
    "IC": 0.30,
    "UE": 0.25,
    "EC": 0.15,
    "NM": 0.10,
    "SG": 0.10,
    "TI": 0.10,
}

ARLevel = Literal["AR0", "AR1", "AR2", "AR3", "AR4", "AR5"]


@dataclass
class Candidate:
    label: str
    IC: float
    UE: float
    EC: float
    NM: float
    SG: float
    TI: float
    ti_penalty_multiplier: float = 1.0

    def score(self, weights: dict[str, float] | None = None) -> float:
        w = weights or REFERENCE_WEIGHTS
        penalty_ti = (1.0 - self.TI) * self.ti_penalty_multiplier
        return (
            w["IC"] * self.IC
            + w["UE"] * self.UE
            + w["EC"] * self.EC
            + w["NM"] * self.NM
            - w["SG"] * self.SG
            - w["TI"] * penalty_ti
        )

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "IC": self.IC,
            "UE": self.UE,
            "EC": self.EC,
            "NM": self.NM,
            "SG": self.SG,
            "TI": self.TI,
            "ti_penalty_multiplier": self.ti_penalty_multiplier,
            "score": self.score(),
        }


@dataclass
class InterpretationResult:
    candidates: list[Candidate]
    scores: list[float]
    margin: float
    risk_category: RiskCategory
    threshold: float
    should_collapse: bool
    ar_level: ARLevel
    winner: Candidate | None

    def to_dict(self) -> dict:
        return {
            "candidates": [c.to_dict() for c in self.candidates],
            "scores": self.scores,
            "margin": self.margin,
            "risk_category": self.risk_category,
            "threshold": self.threshold,
            "should_collapse": self.should_collapse,
            "ar_level": self.ar_level,
            "winner": self.winner.label if self.winner else None,
        }


def resolve_ambiguity(
    candidates: list[Candidate],
    risk: RiskCategory = "advice",
    weights: dict[str, float] | None = None,
) -> InterpretationResult:
    if not candidates:
        raise ValueError("At least one candidate is required.")

    scores = [c.score(weights) for c in candidates]
    sorted_pairs = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
    sorted_scores = [s for s, _ in sorted_pairs]
    sorted_candidates = [c for _, c in sorted_pairs]

    margin = sorted_scores[0] - (sorted_scores[1] if len(sorted_scores) > 1 else 0.0)
    threshold = RISK_THRESHOLDS[risk]
    should_collapse = margin > threshold

    if should_collapse:
        if risk in ("safety-critical", "high-stakes") and margin < threshold + 0.1:
            ar_level: ARLevel = "AR4"
        else:
            ar_level = "AR0" if margin > threshold + 0.3 else "AR1"
    else:
        if len(candidates) == 1:
            ar_level = "AR0"
        elif margin > threshold * 0.8:
            ar_level = "AR4"
        elif margin > threshold * 0.5:
            ar_level = "AR3"
        elif margin > threshold * 0.2:
            ar_level = "AR2"
        else:
            ar_level = "AR5"

    return InterpretationResult(
        candidates=sorted_candidates,
        scores=sorted_scores,
        margin=margin,
        risk_category=risk,
        threshold=threshold,
        should_collapse=should_collapse,
        ar_level=ar_level,
        winner=sorted_candidates[0] if should_collapse else None,
    )


@dataclass
class AdaptiveState:
    ic_penalties: dict[str, float] = field(default_factory=dict)
    uncertainty_boost: float = 0.0
    evidence_log: list[dict] = field(default_factory=list)
    clarification_attempts: int = 0
    max_clarifications: int = 2

    def apply_rejection(self, rejected_label: str, ic_penalty: float = 0.15, uncertainty_increment: float = 0.1) -> None:
        self.ic_penalties[rejected_label] = self.ic_penalties.get(rejected_label, 0.0) + ic_penalty
        self.uncertainty_boost += uncertainty_increment
        self.evidence_log.append({"rejected": rejected_label, "ic_penalty": ic_penalty, "uncertainty_boost": uncertainty_increment})

    def check_ambiguity_budget(self) -> bool:
        return self.clarification_attempts >= self.max_clarifications

    def to_dict(self) -> dict:
        return {
            "ic_penalties": dict(self.ic_penalties),
            "uncertainty_boost": self.uncertainty_boost,
            "evidence_log": list(self.evidence_log),
            "clarification_attempts": self.clarification_attempts,
            "max_clarifications": self.max_clarifications,
            "budget_exhausted": self.check_ambiguity_budget(),
        }


def candidate_from_dict(d: dict) -> Candidate:
    return Candidate(
        label=d["label"],
        IC=float(d["IC"]),
        UE=float(d["UE"]),
        EC=float(d["EC"]),
        NM=float(d["NM"]),
        SG=float(d["SG"]),
        TI=float(d["TI"]),
        ti_penalty_multiplier=float(d.get("ti_penalty_multiplier", 1.0)),
    )
