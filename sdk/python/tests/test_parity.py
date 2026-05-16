"""
TypeScript–Python parity tests.

Expected values computed analytically from the implementation:

Case 1: chaotic/unpredictable/high/short/cautious/anthropic
  H=0.95, P=0.2
  TI=10 (table lookup), SG=35+round((0.2-0.5)*20)=29, FT=60+15=75
  UE=round(20+0.95*60)+15=92, AR=30+(-10)=20
  temp=1.0-(29/100)*1.0=0.71  regime=stable

Case 2: stable/somewhat_pred/low/long/decisive/anthropic
  H=0.2→interpolate(0.1→90, 0.25→70, t=2/3)→TI=77
  SG=70+round((0.55-0.5)*20)=71, FT=25+(-10)=15
  UE=round(20+0.2*60)+(-15)=17, AR=70+5=75
  temp=1.0-(71/100)*1.0=0.29  regime=near_oscillation (TI≥65 ∧ SG≥55)

Case 3: moderate/somewhat_pred/medium/medium/balanced/generic
  H=0.5→TI=50, SG=55+1=56, FT=40, UE=50, AR=50
  temp=1.0-(56/100)*1.0=0.44  regime=stable

Case 4: moderate/somewhat_pred/catastrophic/medium/cautious/openai
  H=0.5→TI=50, SG=20+1=21, FT=80+15=95, UE=50, AR=30-20=10
  temp_openai=2.0-(21/100)*2.0=1.58  regime=stable (UE=50>35)
"""
import pytest
from rpcs1 import recommend_params


PARITY_CASES = [
    {
        "name": "chaotic_high_stakes_anthropic",
        "input": dict(
            task_description="Customer support",
            environment_entropy="chaotic",
            environment_predictability="unpredictable",
            stakes="high",
            context_relevance="short",
            commitment_style="cautious",
            target_platform="anthropic",
        ),
        "expected": {
            "TI": 10,
            "SG": 29,
            "FT": 75,
            "UE": 92,
            "AR": 20,
            "temperature": 0.71,
            "predicted_regime": "stable",
        },
    },
    {
        "name": "stable_low_stakes_anthropic",
        "input": dict(
            task_description="Creative writing",
            environment_entropy="stable",
            environment_predictability="somewhat_predictable",
            stakes="low",
            context_relevance="long",
            commitment_style="decisive",
            target_platform="anthropic",
        ),
        "expected": {
            # H=0.2 interpolates between (H=0.1,TI=90) and (H=0.25,TI=70)
            "TI": 77,
            "SG": 71,
            "FT": 15,
            "UE": 17,
            "AR": 75,
            "temperature": 0.29,
            # TI=77≥65 and SG=71≥55 → near_oscillation (tuner correctly flags mismatch)
            "predicted_regime": "near_oscillation",
        },
    },
    {
        "name": "moderate_medium_stakes_generic",
        "input": dict(
            task_description="Data extraction",
            environment_entropy="moderate",
            environment_predictability="somewhat_predictable",
            stakes="medium",
            context_relevance="medium",
            commitment_style="balanced",
            target_platform="generic",
        ),
        "expected": {
            "TI": 50,
            "SG": 56,
            "FT": 40,
            "UE": 50,
            "AR": 50,
            "temperature": 0.44,
            "predicted_regime": "stable",
        },
    },
    {
        "name": "catastrophic_cautious_openai",
        "input": dict(
            task_description="Medical triage",
            environment_entropy="moderate",
            environment_predictability="somewhat_predictable",
            stakes="catastrophic",
            context_relevance="medium",
            commitment_style="cautious",
            target_platform="openai",
        ),
        "expected": {
            "TI": 50,
            "SG": 21,
            "FT": 95,
            "UE": 50,
            "AR": 10,
            # UE=50>35, so near_freeze not triggered; FT=95≥65 but UE=50>35 → stable
            "temperature": 1.58,
            "predicted_regime": "stable",
        },
    },
]


@pytest.mark.parametrize("case", PARITY_CASES, ids=[c["name"] for c in PARITY_CASES])
def test_parity(case):
    """Lock numeric outputs. Both TS and Python must match these within tolerance."""
    result = recommend_params(**case["input"])
    expected = case["expected"]

    assert abs(result.receiver_profile.TI - expected["TI"]) <= 1, (
        f"TI: got {result.receiver_profile.TI}, expected {expected['TI']}"
    )
    assert abs(result.receiver_profile.SG - expected["SG"]) <= 1, (
        f"SG: got {result.receiver_profile.SG}, expected {expected['SG']}"
    )
    assert abs(result.receiver_profile.FT - expected["FT"]) <= 1, (
        f"FT: got {result.receiver_profile.FT}, expected {expected['FT']}"
    )
    assert abs(result.receiver_profile.UE - expected["UE"]) <= 1, (
        f"UE: got {result.receiver_profile.UE}, expected {expected['UE']}"
    )
    assert abs(result.receiver_profile.AR - expected["AR"]) <= 1, (
        f"AR: got {result.receiver_profile.AR}, expected {expected['AR']}"
    )
    assert abs(result.platform_parameters.temperature - expected["temperature"]) <= 0.02, (
        f"temperature: got {result.platform_parameters.temperature}, expected {expected['temperature']}"
    )
    assert result.predicted_regime == expected["predicted_regime"], (
        f"regime: got {result.predicted_regime}, expected {expected['predicted_regime']}"
    )
