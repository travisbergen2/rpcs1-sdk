from rpcs1 import recommend_params, to_runtime_config


def recommend_for_market(coherence: float, momentum: float) -> dict:
    entropy = "dynamic"
    commitment = "cautious"

    if coherence < 0.50:
        entropy = "chaotic"
        commitment = "cautious"
    elif abs(momentum) > 0.01:
        entropy = "moderate"
        commitment = "balanced"

    rec = recommend_params(
        task_description="Adaptive trading expert advisor",
        environment_entropy=entropy,
        environment_predictability="somewhat_predictable",
        stakes="high",
        context_relevance="short",
        commitment_style=commitment,
        target_platform="generic",
        domain="trading",
    )

    return to_runtime_config(rec)


if __name__ == "__main__":
    config = recommend_for_market(coherence=0.471, momentum=0.00283)
    print(
        "[RPCS-1 SDK] Regime: {regime} | Temp: {temperature:.2f} | "
        "TI: {TI:.0f} | SG: {SG:.0f} | FT: {FT:.0f} | Confidence: {confidence}".format(
            **config
        )
    )
