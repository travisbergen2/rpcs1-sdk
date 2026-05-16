"""
Map receiver profile → platform-specific LLM parameters.

Mirrors TypeScript platforms.ts exactly.
"""
from __future__ import annotations

import json
from pathlib import Path

from .types import (
    ReceiverProfile,
    PlatformParameters,
    Platform,
    ToolUseStrategy,
    RetryStrategy,
    ContextStrategy,
)

_PLATFORMS_PATH = Path(__file__).parent / "config" / "platforms.json"
with _PLATFORMS_PATH.open() as _f:
    _PLATFORMS: dict = json.load(_f)


# ─── Temperature: SG → temperature (inverse) ──────────────────────────────────

def _map_sg_to_temperature(SG: float, t_range: list[float]) -> float:
    lo, hi = t_range[0], t_range[1]
    raw = hi - (SG / 100) * (hi - lo)
    return round(raw * 100) / 100


# ─── Max tokens: TI → max_tokens ──────────────────────────────────────────────

def _map_ti_to_max_tokens(TI: float, t_range: list[int]) -> int:
    lo, hi = t_range[0], t_range[1]
    raw = lo + (TI / 100) * (hi - lo)
    return round(raw / 256) * 256


# ─── Context strategy ─────────────────────────────────────────────────────────

def _map_ti_to_context_strategy(TI: float) -> ContextStrategy:
    if TI >= 65:
        return "long_window"
    if TI >= 35:
        return "rolling_summary"
    return "frequent_grounding"


# ─── Tool use strategy ────────────────────────────────────────────────────────

def _map_ar_to_tool_strategy(AR: float, FT: float) -> ToolUseStrategy:
    if FT >= 65:
        return "explicit_confirmation"
    if AR <= 35:
        return "cautious_chaining"
    if AR >= 65:
        return "aggressive"
    return "fail_fast"


# ─── Retry strategy ───────────────────────────────────────────────────────────

def _map_ue_to_retry_strategy(UE: float) -> RetryStrategy:
    if UE >= 65:
        return "aggressive"
    if UE >= 35:
        return "moderate"
    return "minimal"


# ─── Model selection ──────────────────────────────────────────────────────────

def _select_model(profile: ReceiverProfile, models: dict | None) -> str | None:
    if not models:
        return None
    if profile.TI >= 65 and profile.SG <= 40:
        return models.get("complex_reasoning")
    if profile.TI <= 30 and profile.UE >= 65:
        return models.get("speed_priority")
    return models.get("default")


# ─── System prompt additions ──────────────────────────────────────────────────

def _build_system_prompt_additions(
    profile: ReceiverProfile,
    templates: dict[str, str],
) -> list[str]:
    additions: list[str] = []
    if profile.FT >= 60:
        additions.append(templates["high_stakes"])
    if profile.TI <= 25:
        additions.append(templates["rapid_response"])
    if profile.AR <= 35:
        additions.append(templates["ambiguity_caution"])
    if profile.FT >= 75:
        additions.append(templates["high_filter"])
    # deduplicate while preserving order
    seen: set[str] = set()
    result: list[str] = []
    for item in additions:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


# ─── Top-level ────────────────────────────────────────────────────────────────

def map_to_parameters(profile: ReceiverProfile, platform: Platform) -> PlatformParameters:
    config = _PLATFORMS[platform]

    temperature = _map_sg_to_temperature(profile.SG, config["temperature_range"])
    max_tokens = _map_ti_to_max_tokens(profile.TI, config["max_tokens_range"])
    context_strategy = _map_ti_to_context_strategy(profile.TI)
    tool_use_strategy = _map_ar_to_tool_strategy(profile.AR, profile.FT)
    retry_strategy = _map_ue_to_retry_strategy(profile.UE)
    model_recommendation = _select_model(profile, config.get("model_recommendations"))
    system_prompt_additions = _build_system_prompt_additions(
        profile, config["system_prompt_templates"]
    )

    top_p: float | None = None
    if config.get("supports_top_p"):
        top_p = round((1 - profile.SG / 100) * 0.6 + 0.4, 2)

    return PlatformParameters(
        temperature=temperature,
        top_p=top_p,
        max_tokens=max_tokens,
        model_recommendation=model_recommendation,
        system_prompt_additions=system_prompt_additions,
        tool_use_strategy=tool_use_strategy,
        retry_strategy=retry_strategy,
        context_strategy=context_strategy,
    )
