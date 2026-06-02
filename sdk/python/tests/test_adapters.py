from rpcs1 import recommend_params, to_runtime_config


def test_to_runtime_config_flattens_receiver_primitives() -> None:
    rec = recommend_params(
        task_description="Adaptive trading expert advisor",
        environment_entropy="dynamic",
        environment_predictability="somewhat_predictable",
        stakes="high",
        context_relevance="short",
        commitment_style="cautious",
        target_platform="generic",
        domain="trading",
    )

    runtime = to_runtime_config(rec)

    assert runtime["regime"] == rec.predicted_regime
    assert runtime["confidence"] == rec.confidence
    assert runtime["temperature"] == rec.platform_parameters.temperature
    assert runtime["TI"] == rec.receiver_profile.TI
    assert runtime["SG"] == rec.receiver_profile.SG
    assert runtime["FT"] == rec.receiver_profile.FT
    assert runtime["UE"] == rec.receiver_profile.UE
    assert runtime["AR"] == rec.receiver_profile.AR
