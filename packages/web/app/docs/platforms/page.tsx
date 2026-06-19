import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Platform Mappings' };

export default function PlatformsPage() {
  return (
    <div>
      <h1>Platform Mappings</h1>
      <p>
        After computing the receiver profile, the SDK maps each primitive to
        platform-specific parameters. All mappings are deterministic and config-driven.
        The mapping from receiver primitives to inference-time LLM knobs is an engineering
        hypothesis under validation, not a claim that the AI extension has already been
        empirically settled.
      </p>

      <h2>Temperature (from SG)</h2>
      <p>
        Temperature maps <strong>inversely</strong> to Signal Gain.
        A high-gain receiver discriminates sharply between signals — in LLMs that means low
        temperature (crisp, deterministic outputs). A low-gain receiver is broadly receptive —
        that means higher temperature (exploratory outputs).
      </p>
      <pre><code>{`temperature = t_max - (SG / 100) × (t_max - t_min)

# Anthropic range [0.0, 1.0]:  SG=80 → temp=0.20, SG=20 → temp=0.80
# OpenAI range    [0.0, 2.0]:  SG=80 → temp=0.40, SG=20 → temp=1.60`}</code></pre>

      <h2>Max tokens (from TI)</h2>
      <p>
        Temporal Integration maps directly to context strategy and, as a practical runtime budget,
        to max_tokens. Long integration often needs more output room, but max_tokens is an output
        cap rather than a literal context window; validate truncation and answer quality in your
        own workload.
      </p>
      <pre><code>{`max_tokens = t_min + (TI / 100) × (t_max - t_min), rounded to nearest 256

# Anthropic range [256, 8192]: TI=10 → 1024, TI=77 → 6400`}</code></pre>

      <h2>Context strategy (from TI)</h2>
      <pre><code>{`TI ≥ 65 → long_window       (pass full context)
TI ≥ 35 → rolling_summary   (summarize old turns, keep recent full)
TI < 35 → frequent_grounding (re-inject key facts each turn)`}</code></pre>

      <h2>Tool use strategy (from AR + FT)</h2>
      <pre><code>{`FT ≥ 65 → explicit_confirmation  (verify before every tool call)
AR ≤ 35 → cautious_chaining      (chain tools conservatively)
AR ≥ 65 → aggressive             (act decisively)
else    → fail_fast              (attempt + retry on failure)`}</code></pre>

      <h2>Retry strategy (from UE)</h2>
      <pre><code>{`UE ≥ 65 → aggressive   (retry on any non-success)
UE ≥ 35 → moderate     (retry on transient errors)
UE < 35 → minimal      (retry only on network errors)`}</code></pre>

      <h2>Model selection (from TI + SG + UE)</h2>
      <pre><code>{`TI ≥ 65 and SG ≤ 40 → complex_reasoning model
TI ≤ 30 and UE ≥ 65 → speed_priority model
else                  → default model`}</code></pre>

      <h2>Platform configs</h2>

      <h3>Anthropic</h3>
      <pre><code>{`temperature_range: [0.0, 1.0]
max_tokens_range:  [256, 8192]
models:
  default:           claude-sonnet-4-6
  complex_reasoning: claude-opus-4-6
  speed_priority:    claude-sonnet-4-6
  cheap_high_volume: claude-haiku-4-5-20251001`}</code></pre>

      <h3>OpenAI</h3>
      <pre><code>{`temperature_range: [0.0, 2.0]
max_tokens_range:  [256, 16384]
models:
  default:           gpt-4o
  complex_reasoning: o1
  speed_priority:    gpt-4o-mini`}</code></pre>

      <h3>Open source</h3>
      <pre><code>{`temperature_range: [0.0, 2.0]
max_tokens_range:  [256, 8192]
models:
  default:           llama-3-70b
  complex_reasoning: deepseek-r1
  speed_priority:    llama-3-8b`}</code></pre>

      <h3>Generic</h3>
      <pre><code>{`temperature_range: [0.0, 1.0]
max_tokens_range:  [256, 4096]
model_recommendation: null  (platform-neutral)`}</code></pre>
    </div>
  );
}
