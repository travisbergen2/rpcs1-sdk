"""
RPCS-1 / HF-HATP v1.9 Translator — intent extraction, ambiguity resolution,
audience-aware rewriting, task routing, memory, and persona management.

Built into the RPCS-1 Python SDK.
"""

from .scoring import (
    Candidate,
    InterpretationResult,
    resolve_ambiguity,
    AdaptiveState,
    RISK_THRESHOLDS,
    REFERENCE_WEIGHTS,
)
from .interpreter import interpret, normalize, split
from .rewriter import rewrite, list_styles
from .router import route, list_routes

__all__ = [
    "Candidate",
    "InterpretationResult",
    "resolve_ambiguity",
    "AdaptiveState",
    "RISK_THRESHOLDS",
    "REFERENCE_WEIGHTS",
    "interpret",
    "normalize",
    "split",
    "rewrite",
    "list_styles",
    "route",
    "list_routes",
]
