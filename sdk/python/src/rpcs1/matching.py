"""
Matching Principle implementation (Pred-09-5 from RPCS-1).

Mirrors TypeScript matching.ts exactly.
"""
from __future__ import annotations

import json
from pathlib import Path

_CONFIG_PATH = Path(__file__).parent / "config" / "matching.json"

with _CONFIG_PATH.open() as _f:
    _MATCHING = json.load(_f)

_TI_TABLE: list[dict] = _MATCHING["ti_for_h"]
OSCILLATION_THRESHOLD: int = _MATCHING["oscillation_threshold"]["max_product_SG_TI"]
_ENTROPY_SCALARS: dict[str, float] = _MATCHING["entropy_scalars"]
_PREDICTABILITY_SCALARS: dict[str, float] = _MATCHING["predictability_scalars"]


def matching_principle_ti(H: float) -> float:
    """
    Given environmental entropy H in [0, 1], return recommended TI in [0, 100].

    Uses linear interpolation between the lookup table entries.
    Clamps at endpoints for H < 0.1 or H > 0.95.

    Mirrors TypeScript matchingPrincipleTI(H).
    """
    if H <= _TI_TABLE[0]["H"]:
        return float(_TI_TABLE[0]["TI"])
    if H >= _TI_TABLE[-1]["H"]:
        return float(_TI_TABLE[-1]["TI"])

    for i in range(len(_TI_TABLE) - 1):
        lo = _TI_TABLE[i]
        hi = _TI_TABLE[i + 1]
        if lo["H"] <= H <= hi["H"]:
            t = (H - lo["H"]) / (hi["H"] - lo["H"])
            return round(lo["TI"] + t * (hi["TI"] - lo["TI"]))

    return 50.0  # fallback, should not reach


def entropy_to_scalar(entropy: str) -> float:
    return _ENTROPY_SCALARS.get(entropy, 0.5)


def predictability_to_scalar(predictability: str) -> float:
    return _PREDICTABILITY_SCALARS.get(predictability, 0.55)
