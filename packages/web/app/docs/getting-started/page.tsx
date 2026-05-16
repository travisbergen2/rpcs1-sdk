import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Getting Started' };

export default function GettingStartedPage() {
  return (
    <div>
      <h1>Getting Started</h1>

      <h2>Web tuner (no install)</h2>
      <p>
        The fastest way to use RPCS-1 is the interactive tuner — no install, no account required.
        Go to <a href="/tuner">/tuner</a>, describe your agent, and get recommendations instantly.
      </p>

      <h2>Python SDK</h2>

      <h3>Install</h3>
      <pre><code>pip install rpcs1</code></pre>

      <p>With Anthropic integration:</p>
      <pre><code>pip install rpcs1[anthropic]</code></pre>

      <h3>Basic usage</h3>
      <pre><code>{`from rpcs1 import recommend_params

config = recommend_params(
    task_description="Customer support agent handling refund requests",
    environment_entropy="dynamic",           # stable | moderate | dynamic | chaotic
    environment_predictability="somewhat_predictable",
    stakes="high",                           # low | medium | high | catastrophic
    context_relevance="medium",              # short | medium | long
    commitment_style="cautious",             # decisive | balanced | cautious
    target_platform="anthropic",             # anthropic | openai | open_source | generic
    domain="customer_support",              # optional — improves confidence rating
)

# Platform parameters
print(config.platform_parameters.temperature)          # 0.52
print(config.platform_parameters.max_tokens)           # 3072
print(config.platform_parameters.model_recommendation) # claude-sonnet-4-6
print(config.platform_parameters.tool_use_strategy)    # cautious_chaining
print(config.platform_parameters.context_strategy)     # rolling_summary

# Receiver profile (the five primitives)
print(config.receiver_profile.TI)  # 30 — short integration (matching principle)
print(config.receiver_profile.SG)  # 35 — low gain (high stakes)
print(config.receiver_profile.FT)  # 75 — high filter (cautious + high stakes)

# Interpretation
print(config.predicted_regime)     # stable
print(config.confidence)           # high
print(config.reasoning)            # cites Matching Principle (Pred-09-5)
for w in config.warnings:
    print(f"⚠ {w}")               # any regime-boundary warnings`}</code></pre>

      <h3>Anthropic integration</h3>
      <pre><code>{`from rpcs1 import recommend_params
from rpcs1.integrations.anthropic import to_anthropic_params
import anthropic

rec = recommend_params(
    task_description="Medical triage assistant",
    environment_entropy="moderate",
    environment_predictability="somewhat_predictable",
    stakes="catastrophic",
    commitment_style="cautious",
    target_platform="anthropic",
)

params = to_anthropic_params(
    rec,
    system_prompt="You are a medical intake assistant.",
    user_message="I have chest pain and shortness of breath.",
)

client = anthropic.Anthropic()
message = client.messages.create(**params)
print(message.content[0].text)`}</code></pre>

      <h3>SDK license key (paid tier)</h3>
      <p>
        The SDK is open to install. Free tier allows 5 calls per day.
        Paid tiers (Indie $40/month, Team $400/month) unlock unlimited calls.
        After payment you receive a license key by email. Pass it in your environment:
      </p>
      <pre><code>{`export RPCS1_LICENSE_KEY="your-license-key"

# Or pass it directly (coming in v0.2):
# recommend_params(..., license_key=os.environ["RPCS1_LICENSE_KEY"])`}</code></pre>

      <p>
        See <a href="/pricing">pricing</a> for full tier comparison.
      </p>
    </div>
  );
}
