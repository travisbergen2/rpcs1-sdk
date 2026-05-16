"""Unit tests for the five receiver primitive computations."""
import pytest
from rpcs1.matching import matching_principle_ti, entropy_to_scalar
from rpcs1.primitives import compute_sg, compute_ft, compute_ue, compute_ar, compute_receiver_profile
from rpcs1.types import AgentEnvironment, TaskDescriptor


class TestMatchingPrincipleTI:
    def test_h01_ti90(self):
        assert matching_principle_ti(0.1) == 90

    def test_h095_ti10(self):
        assert matching_principle_ti(0.95) == 10

    def test_h05_ti50(self):
        assert matching_principle_ti(0.5) == 50

    def test_interpolation_midpoint(self):
        # H=0.375 is between H=0.25 (TI=70) and H=0.5 (TI=50)
        ti = matching_principle_ti(0.375)
        assert 55 < ti < 70

    def test_clamp_below(self):
        assert matching_principle_ti(0.0) == 90

    def test_clamp_above(self):
        assert matching_principle_ti(1.0) == 10


class TestComputeSG:
    def test_catastrophic_low_sg(self):
        assert compute_sg("catastrophic", 0.5) < 30

    def test_low_stakes_high_predictability(self):
        sg = compute_sg("low", 0.9)
        assert sg > 60

    def test_bounds(self):
        assert compute_sg("catastrophic", 0.0) >= 0
        assert compute_sg("low", 1.0) <= 100


class TestComputeFT:
    def test_catastrophic_cautious_max_ft(self):
        assert compute_ft("catastrophic", "cautious") >= 90

    def test_low_decisive_min_ft(self):
        assert compute_ft("low", "decisive") < 30

    def test_bounds(self):
        assert 0 <= compute_ft("catastrophic", "cautious") <= 100
        assert 0 <= compute_ft("low", "decisive") <= 100


class TestComputeUE:
    def test_chaotic_short_context_high_ue(self):
        assert compute_ue(0.95, "short") > 70

    def test_stable_long_context_low_ue(self):
        assert compute_ue(0.2, "long") < 30

    def test_bounds(self):
        assert compute_ue(0.0, "long") >= 0
        assert compute_ue(1.0, "short") <= 100


class TestComputeAR:
    def test_decisive_low_high_ar(self):
        assert compute_ar("decisive", "low") > 65

    def test_cautious_catastrophic_very_low_ar(self):
        assert compute_ar("cautious", "catastrophic") < 20

    def test_bounds(self):
        assert 0 <= compute_ar("decisive", "low") <= 100
        assert 0 <= compute_ar("cautious", "catastrophic") <= 100


class TestComputeReceiverProfile:
    def test_all_primitives_in_range(self):
        env = AgentEnvironment(
            entropy="dynamic",
            predictability="somewhat_predictable",
            stakes="medium",
            context_relevance="medium",
            commitment_style="balanced",
        )
        task = TaskDescriptor(task_summary="test")
        profile = compute_receiver_profile(env, task)
        for name in ["TI", "SG", "FT", "UE", "AR"]:
            val = getattr(profile, name)
            assert 0 <= val <= 100, f"{name}={val} out of range"

    def test_matching_principle_drives_ti(self):
        """TI should be lower for chaotic than stable."""
        env_chaotic = AgentEnvironment(
            entropy="chaotic",
            predictability="unpredictable",
            stakes="medium",
            context_relevance="medium",
            commitment_style="balanced",
        )
        env_stable = AgentEnvironment(
            entropy="stable",
            predictability="highly_predictable",
            stakes="medium",
            context_relevance="medium",
            commitment_style="balanced",
        )
        task = TaskDescriptor(task_summary="test")
        chaotic_profile = compute_receiver_profile(env_chaotic, task)
        stable_profile = compute_receiver_profile(env_stable, task)
        assert chaotic_profile.TI < stable_profile.TI
