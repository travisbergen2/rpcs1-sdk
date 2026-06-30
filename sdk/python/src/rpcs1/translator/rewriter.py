"""RPCS-1 Rewriter — audience-aware text rewriting."""
REWRITE_STYLES = {
    "technical": {"label": "Technical", "description": "Preserve exact language and precision",
                  "instructions": "Use precise terminology. Maintain all technical details. Prefer passive voice where appropriate."},
    "plain": {"label": "Plain", "description": "Clear but not condescending",
              "instructions": "Use simple, clear language. Avoid jargon. Be direct but friendly."},
    "socially_gentle": {"label": "Socially Gentle", "description": "Soften tone to reduce confrontation",
                        "instructions": "Use softer framing. Replace accusations with observations. Add buffers like 'I think' and 'maybe'."},
    "concise": {"label": "Concise", "description": "Shortest useful form",
                "instructions": "Cut all unnecessary words. Use bullet points. Remove pleasantries."},
    "detailed": {"label": "Detailed", "description": "Expanded with context and assumptions",
                 "instructions": "Add context, explain reasoning, state assumptions. Include caveats and edge cases."},
    "direct": {"label": "Direct", "description": "Remove hedging, keep truth",
               "instructions": "Remove qualifying language. Be straightforward. State the truth without softening."},
}


def rewrite(text: str, style: str = "plain") -> dict:
    if style not in REWRITE_STYLES:
        return {"error": f"Unknown style '{style}'. Available: {', '.join(REWRITE_STYLES)}",
                "original": text, "style": style, "rewritten": None,
                "available_styles": list(REWRITE_STYLES.keys())}
    info = REWRITE_STYLES[style]
    return {"original": text, "style": style, "style_label": info["label"],
            "style_description": info["description"],
            "rewrite_instructions": info["instructions"],
            "rewritten": None,
            "note": "Pass this payload to an LLM with the rewrite_instructions as the system prompt."}


def list_styles() -> dict:
    return {"styles": list(REWRITE_STYLES.keys()), "details": REWRITE_STYLES}
