"""RPCS-1 Intent interpretation, normalization, and splitting."""
from .scoring import Candidate, resolve_ambiguity

_AMBIGUITY_PATTERNS: dict[str, list[dict]] = {
    "i'm fine": [
        {"label": "neutral", "IC": 0.80, "UE": 0.20, "EC": 0.50, "NM": 0.50, "SG": 0.10, "TI": 1.00},
        {"label": "frustrated", "IC": 0.40, "UE": 0.90, "EC": 0.50, "NM": 0.50, "SG": 0.70, "TI": 0.90},
    ],
    "i don't know": [
        {"label": "uncertain", "IC": 0.85, "UE": 0.30, "EC": 0.20, "NM": 0.50, "SG": 0.10, "TI": 1.00},
        {"label": "avoiding_answer", "IC": 0.20, "UE": 0.70, "EC": 0.60, "NM": 0.50, "SG": 0.60, "TI": 0.80},
        {"label": "thinking", "IC": 0.40, "UE": 0.50, "EC": 0.30, "NM": 0.70, "SG": 0.40, "TI": 0.90},
    ],
    "whatever you think": [
        {"label": "deferring", "IC": 0.70, "UE": 0.30, "EC": 0.30, "NM": 0.50, "SG": 0.20, "TI": 1.00},
        {"label": "apathetic", "IC": 0.30, "UE": 0.60, "EC": 0.80, "NM": 0.50, "SG": 0.60, "TI": 0.90},
    ],
    "it's nothing": [
        {"label": "literal", "IC": 0.75, "UE": 0.20, "EC": 0.40, "NM": 0.50, "SG": 0.10, "TI": 1.00},
        {"label": "dismissive", "IC": 0.30, "UE": 0.70, "EC": 0.70, "NM": 0.50, "SG": 0.60, "TI": 0.85},
    ],
}


def interpret(text: str, context: str | None = None, no_inference: bool = False,
               target_audience: str = "plain", risk: str = "advice") -> dict:
    result = {
        "literal_summary": text, "implied_meaning": None, "ambiguities": [],
        "confidence": 0.0, "suggested_next_step": "proceed",
        "clean_prompt": text, "clarifying_questions": [],
        "ar_level": "AR0", "candidates": [], "margin": 0.0,
    }
    if no_inference:
        result["confidence"] = 1.0
        return result

    lower = text.lower().strip()
    for pattern, candidates_data in _AMBIGUITY_PATTERNS.items():
        if pattern in lower:
            candidates = [Candidate(**c) for c in candidates_data]
            resolution = resolve_ambiguity(candidates, risk=risk)  # type: ignore
            result["candidates"] = [c.to_dict() for c in resolution.candidates]
            result["margin"] = resolution.margin
            result["ar_level"] = resolution.ar_level
            result["confidence"] = resolution.scores[0] if resolution.scores else 0.0

            if resolution.should_collapse and resolution.winner:
                result["implied_meaning"] = f"Most likely: {resolution.winner.label}"
                result["suggested_next_step"] = "proceed_with_awareness"
            else:
                labels = [c.label for c in resolution.candidates]
                result["ambiguities"] = [f"Could be interpreted as: {', '.join(labels)}"]
                result["suggested_next_step"] = "clarify"
                result["clarifying_questions"] = [
                    f"I see multiple possibilities ({', '.join(labels)}). Can you clarify which one you meant?"
                ]
            return result

    words = text.split()
    result["confidence"] = min(0.9, len(words) / 20 + 0.5)
    return result


def normalize(text: str) -> dict:
    fragments = [f.strip() for f in text.replace("...", "|||").replace("..", "|||").split("|||") if f.strip()]
    return {"original": text, "fragments": fragments,
            "normalized": " ".join(fragments) if fragments else text,
            "fragment_count": len(fragments) if len(fragments) > 1 else 1}


def split(text: str) -> dict:
    import re
    parts = re.split(r"(?:and\s+also|but\s+also|and|but|\.\s*|;\s*)", text)
    parts = [p.strip() for p in parts if p.strip()]
    return {"original": text, "intents": parts, "count": len(parts)}
