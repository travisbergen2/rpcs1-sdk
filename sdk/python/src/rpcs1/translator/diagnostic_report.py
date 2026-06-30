"""
RPCS-1 Diagnostic Report Generator.

Takes a diagnostic brief and generates a structured report
using the RPCS-1 scoring engine.
"""
from __future__ import annotations
import json
import time
from .scoring import Candidate, resolve_ambiguity, REFERENCE_WEIGHTS, RISK_THRESHOLDS


def generate_report(brief: dict) -> dict:
    """
    Generate a diagnostic report from a brief submission.

    The brief should include: name, email, company, agent_type,
    biggest_risk, desired_outcome, notes.
    """
    agent_type = brief.get("agent_type", "support copilot")
    biggest_risk = brief.get("biggest_risk", "")
    desired_outcome = brief.get("desired_outcome", "")

    # ── Analyze the brief ──────────────────────────────────────
    # Derive environmental parameters from the text
    risk_keywords = {
        "high": ["catastrophic", "critical", "safety", "death", "injury", "legal", "compliance",
                  "financial", "revenue", "customer", "production", "live"],
        "medium": ["error", "mistake", "bug", "fail", "confusion", "wrong", "miss"],
        "low": ["minor", "cosmetic", "nice to have", "preference"],
    }

    text_lower = f"{biggest_risk} {desired_outcome}".lower()
    words = set(text_lower.split())

    # Assess stakes
    high_score = sum(1 for k in risk_keywords["high"] if k in text_lower)
    med_score = sum(1 for k in risk_keywords["medium"] if k in text_lower)

    if high_score >= 3:
        stakes = "high"
        risk_cat = "high-stakes"
    elif high_score >= 1 or med_score >= 3:
        stakes = "medium"
        risk_cat = "advice"
    else:
        stakes = "low"
        risk_cat = "casual"

    # Assess confidence/commitment
    confident_words = ["confident", "certain", "sure", "know", "definitely", "clearly"]
    uncertain_words = ["maybe", "perhaps", "possibly", "not sure", "uncertain", "guess"]
    confidence = 0.5
    for w in confident_words:
        if w in text_lower:
            confidence = min(1.0, confidence + 0.15)
    for w in uncertain_words:
        if w in text_lower:
            confidence = max(0.0, confidence - 0.1)

    # Assess semantic gap (vagueness)
    vague_words = ["thing", "stuff", "something", "somehow", "somewhere", "kind of", "sort of"]
    sg_score = sum(1 for w in vague_words if w in text_lower)
    semantic_gap = min(0.8, 0.1 + sg_score * 0.15)

    # Assess user evidence (how specific they are)
    detail_markers = ["example", "specific", "concrete", "scenario", "when", "exactly"]
    ue_score = sum(1 for w in detail_markers if w in text_lower)
    user_evidence = min(0.9, 0.2 + ue_score * 0.15)

    # ── Generate primitives ─────────────────────────────────────
    ti_base = 0.85 if stakes in ("high", "medium") else 0.70
    ic = confidence
    ue = user_evidence
    ec = confidence
    nm = 0.6  # Default narrative momentum
    sg = semantic_gap
    ti = ti_base

    # Compute scores and resolution
    candidates = [
        Candidate(label="Recommended Config", IC=ic, UE=ue, EC=ec, NM=nm, SG=sg, TI=ti),
        Candidate(label="Conservative Config", IC=max(0.1, ic-0.3), UE=ue, EC=ec, NM=nm, SG=sg, TI=min(1.0, ti+0.15)),
    ]
    resolution = resolve_ambiguity(candidates, risk=risk_cat)

    # ── Build report ────────────────────────────────────────────
    regime = _classify_regime(resolution.margin, stakes, ic)
    recommended_posture = _recommend_posture(resolution.ar_level, risk_cat)
    next_tests = _suggest_next_tests(resolution, risk_cat, agent_type)

    report = {
        "report_id": f"diag-{int(time.time())}",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": {
            "agent_type": agent_type,
            "stakes_assessment": stakes,
            "risk_category": risk_cat,
            "stability_regime": regime,
            "confidence_score": round(ic, 2),
            "ambiguity_margin": round(resolution.margin, 3),
            "ar_level": resolution.ar_level,
        },
        "primitives": {
            "IC": round(ic, 2),
            "UE": round(ue, 2),
            "EC": round(ec, 2),
            "NM": round(nm, 2),
            "SG": round(sg, 2),
            "TI": round(ti, 2),
        },
        "recommendations": {
            "should_collapse": resolution.should_collapse,
            "posture": recommended_posture,
            "next_tests": next_tests,
        },
        "raw_analysis": resolution.to_dict() if hasattr(resolution, 'to_dict') else {},
    }

    return report


def _classify_regime(margin: float, stakes: str, confidence: float) -> str:
    if margin < 0.05:
        return "underdetermined"
    if margin < 0.15:
        return "oscillating" if stakes in ("high", "medium") else "stable"
    if confidence > 0.7:
        return "stable"
    if margin > 0.5:
        return "stable"
    return "cautious"


def _recommend_posture(ar_level: str, risk_cat: str) -> dict:
    postures = {
        "AR0": {
            "label": "Direct",
            "description": "Execute immediately. Intent is clear and stakes are appropriate.",
            "settings": {"temperature": 0.3, "top_p": 0.9},
        },
        "AR1": {
            "label": "Mirror",
            "description": "Execute with assumptions noted in playback.",
            "settings": {"temperature": 0.4, "top_p": 0.85},
        },
        "AR4": {
            "label": "Clarify",
            "description": "Ask one specific question before proceeding.",
            "settings": {"temperature": 0.2, "top_p": 0.8},
        },
        "AR5": {
            "label": "Refuse",
            "description": "Cannot collapse ambiguity. Needs human intervention.",
            "settings": {"temperature": 0.1, "top_p": 0.7},
        },
    }
    return postures.get(ar_level, postures["AR4"])


def _suggest_next_tests(resolution, risk_cat: str, agent_type: str) -> list[str]:
    tests = []
    if resolution.ar_level in ("AR4", "AR5"):
        tests.append(f"Run 3 ambiguous {agent_type} scenarios to test clarification behavior")
    if risk_cat in ("high-stakes", "safety-critical"):
        tests.append("Verify safety constraints on a test set before production")
    elif risk_cat == "advice":
        tests.append("A/B test recommended settings against current configuration")
    tests.append("Rerun the diagnostic after implementing changes to confirm improvement")
    return tests
