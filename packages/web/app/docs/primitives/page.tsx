import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'The Five Primitives' };

const PRIMITIVES = [
  {
    abbr: 'TI',
    name: 'Temporal Integration',
    range: '[0, 100]',
    driveBy: 'Environmental entropy (Matching Principle: TI ~ 1/H)',
    mapsTo: 'max_tokens, context_strategy',
    low: 'Short attention window — agent processes recent signals only (frequent_grounding strategy)',
    high: 'Long attention window — agent integrates deep history (long_window strategy)',
    example: 'Chaotic environment (H=0.95) → TI ≈ 10. Stable environment (H=0.2) → TI ≈ 77.',
  },
  {
    abbr: 'SG',
    name: 'Signal Gain',
    range: '[0, 100]',
    driveBy: 'Stakes (primary), environmental predictability (adjustment)',
    mapsTo: 'temperature (inversely), top_p',
    low: 'Low amplification — agent is conservative, less responsive to weak signals. Maps to LOWER temperature.',
    high: 'High amplification — agent responds strongly to all signals. Maps to HIGHER temperature.',
    example: 'catastrophic stakes → SG ≈ 20 → temperature ≈ 0.8 (more cautious sampling). low stakes → SG ≈ 75 → temperature ≈ 0.25.',
  },
  {
    abbr: 'FT',
    name: 'Filtering Threshold',
    range: '[0, 100]',
    driveBy: 'Stakes (primary), commitment style (adjustment)',
    mapsTo: 'tool_use_strategy, system_prompt_additions',
    low: 'Low gating — agent acts readily on incoming signals (aggressive tool use).',
    high: 'High gating — agent verifies before acting (explicit_confirmation tool strategy).',
    example: 'catastrophic stakes + cautious style → FT = 95 → explicit_confirmation + high_stakes system prompt.',
  },
  {
    abbr: 'UE',
    name: 'Update Elasticity',
    range: '[0, 100]',
    driveBy: 'Environmental entropy (primary), context relevance (adjustment)',
    mapsTo: 'retry_strategy',
    low: 'Low elasticity — agent resists revising its model (minimal retry).',
    high: 'High elasticity — agent updates readily on new information (aggressive retry).',
    example: 'chaotic entropy + short context → UE = 92 → aggressive retry. stable + long context → UE ≈ 17 → minimal retry.',
  },
  {
    abbr: 'AR',
    name: 'Ambiguity Resolution',
    range: '[0, 100]',
    driveBy: 'Commitment style (primary), stakes (adjustment)',
    mapsTo: 'tool_use_strategy (combined with FT)',
    low: 'Low resolution — agent defers when uncertain, asks for clarification (ambiguity_caution prompt).',
    high: 'High resolution — agent commits under uncertainty, resolves ambiguity aggressively.',
    example: 'cautious + catastrophic → AR = 10. decisive + low → AR = 75.',
  },
];

export default function PrimitivesPage() {
  return (
    <div>
      <h1>The Five Receiver Primitives</h1>
      <p>
        Every RPCS-1 recommendation is computed from five receiver primitives.
        Each primitive is a scalar in [0, 100], derived deterministically from your environment
        inputs. Together they characterise the receiver profile that is structurally stable
        in your agent&apos;s environment.
      </p>

      {PRIMITIVES.map((p) => (
        <div key={p.abbr} className="not-prose my-8 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-900 border-b border-gray-800">
            <span className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold font-mono text-sm flex-shrink-0">
              {p.abbr}
            </span>
            <div>
              <h2 className="text-base font-bold text-white">{p.name}</h2>
              <p className="text-xs text-gray-500 font-mono">{p.range}</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1 font-semibold">Driven by</p>
                <p className="text-gray-400">{p.driveBy}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1 font-semibold">Maps to</p>
                <p className="text-gray-400 font-mono text-xs">{p.mapsTo}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-gray-800">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1 font-semibold">Low value</p>
                <p className="text-gray-400">{p.low}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1 font-semibold">High value</p>
                <p className="text-gray-400">{p.high}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-1 font-semibold">Example</p>
              <p className="text-gray-500 font-mono text-xs">{p.example}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
