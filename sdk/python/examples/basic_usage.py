"""
RPCS-1 Python SDK — basic usage example.

Install: pip install rpcs1
"""
from rpcs1 import recommend_params

# -------------------------------------------------------------------
# Example 1: Customer support agent (high entropy, high stakes)
# -------------------------------------------------------------------
rec = recommend_params(
    task_description="Customer support agent handling refund requests and billing disputes",
    environment_entropy="dynamic",
    environment_predictability="somewhat_predictable",
    stakes="high",
    context_relevance="medium",
    commitment_style="cautious",
    target_platform="anthropic",
    domain="customer_support",
)

print("=== Example 1: Customer Support Agent ===")
print(f"Predicted regime: {rec.predicted_regime}")
print(f"\nReceiver profile:")
print(f"  TI (Temporal Integration): {rec.receiver_profile.TI}")
print(f"  SG (Signal Gain):          {rec.receiver_profile.SG}")
print(f"  FT (Filtering Threshold):  {rec.receiver_profile.FT}")
print(f"  UE (Update Elasticity):    {rec.receiver_profile.UE}")
print(f"  AR (Ambiguity Resolution): {rec.receiver_profile.AR}")
print(f"\nPlatform parameters:")
print(f"  temperature:        {rec.platform_parameters.temperature}")
print(f"  max_tokens:         {rec.platform_parameters.max_tokens}")
print(f"  model:              {rec.platform_parameters.model_recommendation}")
print(f"  tool_use_strategy:  {rec.platform_parameters.tool_use_strategy}")
print(f"  context_strategy:   {rec.platform_parameters.context_strategy}")
print(f"\nReasoning:\n  {rec.reasoning}")
if rec.warnings:
    print(f"\nWarnings:")
    for w in rec.warnings:
        print(f"  ⚠ {w}")
print(f"\nIMM principles applied:")
for p in rec.imm_principles_applied:
    print(f"  • {p}")

# -------------------------------------------------------------------
# Example 2: CI/CD automation agent (low entropy, low stakes)
# -------------------------------------------------------------------
print("\n\n=== Example 2: CI/CD Automation Agent ===")
rec2 = recommend_params(
    task_description="Automated CI pipeline agent that runs tests and deploys on green",
    environment_entropy="stable",
    environment_predictability="highly_predictable",
    stakes="low",
    context_relevance="short",
    commitment_style="decisive",
    target_platform="openai",
    domain="devops",
)
print(f"Predicted regime: {rec2.predicted_regime}")
print(f"temperature:      {rec2.platform_parameters.temperature}")
print(f"tool strategy:    {rec2.platform_parameters.tool_use_strategy}")
print(f"TI:               {rec2.receiver_profile.TI}")
print(f"AR:               {rec2.receiver_profile.AR}")
