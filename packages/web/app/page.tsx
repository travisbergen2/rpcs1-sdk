import Link from 'next/link';
import { AgentFailureDemo } from '@/components/AgentFailureDemo';
import { AgentGuide } from '@/components/AgentGuide';
import { ProductionProof } from '@/components/ProductionProof';
import { TrackedLink } from '@/components/TrackedLink';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

const PROBLEMS = [
  {
    regime: 'Oscillation',
    badge: 'oscillation' as const,
    description: 'Agent revisits the same tool calls, refuses to commit. High TI + high SG in a fast-changing environment.',
    fix: 'Lower SG, shorten context window (TI ↓)',
  },
  {
    regime: 'Overload',
    badge: 'overload' as const,
    description: 'Agent acts on insufficient information, hallucinates tool calls. High SG + low FT + short integration.',
    fix: 'Raise FT, lower SG, add retry strategy',
  },
  {
    regime: 'Freeze',
    badge: 'freeze' as const,
    description: 'Agent hedges endlessly, never takes action. Low UE + high FT — stuck in the filter.',
    fix: 'Lower FT, raise UE, adjust commitment style',
  },
];

const PRIMITIVES = [
  { abbr: 'TI', name: 'Temporal Integration', desc: 'How much history to integrate. Maps to context window strategy and max_tokens.' },
  { abbr: 'SG', name: 'Signal Gain', desc: 'How strongly to amplify signals. Maps inversely to temperature.' },
  { abbr: 'FT', name: 'Filtering Threshold', desc: 'How conservatively to gate action. Drives tool use strategy.' },
  { abbr: 'UE', name: 'Update Elasticity', desc: 'How readily to revise the model. Sets retry and grounding strategy.' },
  { abbr: 'AR', name: 'Ambiguity Resolution', desc: 'How aggressively to commit when uncertain.' },
];

const CX_SIGNALS = [
  'Support copilot gives inconsistent guidance across similar cases',
  'QA finds tone, policy, or escalation drift after launch',
  'Agent assistance works in demos but struggles under live queue pressure',
  'Teams cannot tell whether failures come from model choice, prompt design, or operating conditions',
];

export default function HomePage() {
  return (
    <div>
      <AgentGuide />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center">
        <Badge variant="neutral" className="mb-6 text-xs">
          Built on RPCS-1 receiver dynamics · Pred-09-5 operationalized
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          Turn deployed AI agents into{' '}
          <span className="gradient-text">optimized AI agents.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed">
          Describe your agent&apos;s task and operating conditions. Get a deterministic tuning
          hypothesis for temperature, context, tools, and model fit — derived from the
          environment your agent actually runs in.
        </p>
        <p className="text-sm text-gray-500 max-w-xl mx-auto mb-8">
          Start with a filled example if you just want to see whether the framework clicks.
          No account, email, or payment required.
        </p>

        {/* Concrete output preview */}
        <div className="inline-flex flex-wrap gap-3 justify-center mb-10 text-sm font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            temperature <span className="text-sky-400">0.52</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            max_tokens <span className="text-sky-400">4096</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            regime <span className="text-emerald-400">stable</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            context <span className="text-amber-400">rolling_summary</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <TrackedLink
            href="/tuner?preset=support"
            eventName="Homepage CTA Clicked"
            eventData={{ location: 'hero', action: 'live_example', preset: 'support' }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all shadow-lg shadow-sky-500/25"
          >
            Show me a live example
          </TrackedLink>
          <TrackedLink
            href="/tuner"
            eventName="Homepage CTA Clicked"
            eventData={{ location: 'hero', action: 'custom_tuner', preset: 'none' }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl transition-colors border border-gray-700"
          >
            Tune my own agent
          </TrackedLink>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          No sign-up required. Free forever for web tuner access.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
          <span className="text-gray-600 py-2">Popular starts:</span>
          <TrackedLink
            href="/tuner?preset=support"
            eventName="Homepage Preset Clicked"
            eventData={{ preset: 'support' }}
            className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-400 hover:text-white hover:border-gray-700"
          >
            support agent
          </TrackedLink>
          <TrackedLink
            href="/tuner?preset=coding"
            eventName="Homepage Preset Clicked"
            eventData={{ preset: 'coding' }}
            className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-400 hover:text-white hover:border-gray-700"
          >
            coding agent
          </TrackedLink>
          <TrackedLink
            href="/tuner?preset=research"
            eventName="Homepage Preset Clicked"
            eventData={{ preset: 'research' }}
            className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-400 hover:text-white hover:border-gray-700"
          >
            research agent
          </TrackedLink>
        </div>
      </section>

      <AgentFailureDemo />

      {/* CX optimization wedge */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 sm:p-12">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <div>
              <p className="text-xs text-emerald-400 font-mono mb-3">CX AI optimization</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Already deployed AI in support?
              </h2>
              <p className="text-gray-400 leading-relaxed mb-5">
                RPCS1 is a lightweight diagnostic layer for customer support copilots,
                QA assistants, knowledge tools, and agent-assistance workflows. It asks
                whether the agent is matched to the environment it actually runs in:
                queue pressure, policy ambiguity, stakes, context horizon, and how quickly
                the system should commit.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                The point is fit, not fault. If a deployed support agent is inconsistent,
                the first question should be whether the task, model settings, and operating
                conditions are mismatched.
              </p>
            </div>

            <Card className="p-6 bg-gray-950/60">
              <CardContent className="p-0">
                <p className="text-sm font-semibold text-gray-200 mb-4">Run this check when:</p>
                <ul className="space-y-3 mb-6">
                  {CX_SIGNALS.map((signal) => (
                    <li key={signal} className="flex gap-3 text-sm text-gray-400">
                      <span className="text-emerald-400 mt-0.5">-</span>
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
                <TrackedLink
                  href="/tuner?preset=support"
                  eventName="Homepage CTA Clicked"
                  eventData={{ location: 'cx_section', action: 'support_copilot_assessment', preset: 'support' }}
                  className="inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
                >
                  Run support copilot assessment
                </TrackedLink>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <ProductionProof />

      {/* Code preview */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-800">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-gray-600 font-mono">python</span>
          </div>
          <pre className="p-6 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed">
{`from rpcs1 import recommend_params

config = recommend_params(
    task_description=`}<span className="text-amber-300">&quot;Customer support agent&quot;</span>{`,
    environment_entropy=`}<span className="text-amber-300">&quot;dynamic&quot;</span>{`,
    stakes=`}<span className="text-amber-300">&quot;high&quot;</span>{`,
    commitment_style=`}<span className="text-amber-300">&quot;cautious&quot;</span>{`,
    target_platform=`}<span className="text-amber-300">&quot;anthropic&quot;</span>{`,
)

`}<span className="text-gray-500"># Grounded in Matching Principle (Pred-09-5: TI ~ 1/H)</span>{`
print(config.platform_parameters.temperature)   `}<span className="text-gray-500"># 0.52</span>{`
print(config.platform_parameters.model_recommendation) `}<span className="text-gray-500"># claude-sonnet-4-6</span>{`
print(config.predicted_regime)                  `}<span className="text-gray-500"># stable</span>{`
print(config.receiver_profile.TI)               `}<span className="text-gray-500"># 30</span>
          </pre>
        </div>
      </section>

      {/* Problem section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            The problem every deployed agent eventually exposes
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            You ship an agent. It works in testing. In production the conditions change. It starts failing in one of
            three structural ways — and you have no framework for diagnosing why.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {PROBLEMS.map((p) => (
            <Card key={p.regime} className="p-6">
              <CardContent className="p-0">
                <Badge variant={p.badge} className="mb-3">{p.regime}</Badge>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{p.description}</p>
                <div className="pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-600 font-mono">{p.fix}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Five primitives */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 sm:p-12">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Five primitives. One structural framework.
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Every recommendation is driven by five receiver primitives from RPCS-1, each
              mapped to an inference-time tuning hypothesis. All outputs are deterministic
              and traceable — no black-box recommendations.
            </p>
          </div>
          <div className="space-y-4">
            {PRIMITIVES.map((p) => (
              <div key={p.abbr} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <span className="text-sky-400 font-bold text-sm font-mono">{p.abbr}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{p.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matching principle callout */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-8 sm:p-12 text-center">
          <p className="text-xs text-sky-400 font-mono mb-3">Pred-09-5 from IMM Paper 9</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
            The Matching Principle: TI ≈ 1 / H
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto leading-relaxed mb-6">
            Agents in high-entropy environments are assigned short integration windows. Agents
            in stable environments are assigned longer integration. RPCS1 operationalizes this
            untested prediction as a practical tuning rule to validate against production traces.
          </p>
          <Link href="/docs/matching" className="text-sm text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-4">
            Read the full explanation →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-32 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to tune your agent?</h2>
        <p className="text-gray-400 mb-8">
          Free web tuner: 10 recommendations per hour. Paid SDK access starts at $40/month. Team plan at $400/month.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tuner"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all"
          >
            Open the tuner →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-xl transition-colors"
          >
            View pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
