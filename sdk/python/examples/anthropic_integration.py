"""
RPCS-1 + Anthropic integration example.

Install: pip install rpcs1[anthropic]
"""
from rpcs1 import recommend_params
from rpcs1.integrations.anthropic import to_anthropic_params

# Get RPCS-1 recommendations for a medical triage agent
rec = recommend_params(
    task_description="Medical intake assistant that triages patient symptoms and recommends urgency level",
    environment_entropy="moderate",
    environment_predictability="somewhat_predictable",
    stakes="catastrophic",
    context_relevance="medium",
    commitment_style="cautious",
    target_platform="anthropic",
    domain="healthcare",
)

# Convert to Anthropic API parameters
system_prompt = "You are a medical intake assistant. You help patients describe their symptoms."
user_message = "I've had a headache and fever for two days."

params = to_anthropic_params(
    rec,
    system_prompt=system_prompt,
    user_message=user_message,
)

print("=== Anthropic API Parameters from RPCS-1 ===")
print(f"Model:       {params['model']}")
print(f"Temperature: {params['temperature']}")
print(f"Max tokens:  {params['max_tokens']}")
print(f"\nSystem prompt (first 100 chars):")
print(f"  {params['system'][:100]}...")
print(f"\nRegime: {rec.predicted_regime}")
print(f"Confidence: {rec.confidence}")

# To actually call the API:
# import anthropic
# client = anthropic.Anthropic()
# message = client.messages.create(**params)
# print(message.content[0].text)
