import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

const AgentGuide = dynamic(
  () => import('@/components/AgentGuide').then((mod) => mod.AgentGuide),
  { loading: () => null }
);
const AgentFailureDemo = dynamic(
  () => import('@/components/AgentFailureDemo').then((mod) => mod.AgentFailureDemo),
  { loading: () => null }
);
const ProductionProof = dynamic(
  () => import('@/components/ProductionProof').then((mod) => mod.ProductionProof),
  { loading: () => null }
);

const PROBLEMS = [
  {
    regime: 'Consistency drift',
    badge: 'oscillation' as const,
    description: 'Similar cases get different answers, or the agent repeats tools without reaching a resolution.',
    fix: 'RPCS-1 signal: oscillation risk',
  },
  {
    regime: 'Quality risk',
    badge: 'overload' as const,
    description: 'The agent acts on weak evidence, misses policy context, or invents an unsupported action.',
    fix: 'RPCS-1 signal: overload risk',
  },
  {
    regime: 'Stalled resolution',
    badge: 'freeze' as const,
    description: 'The agent over-refuses, hedges, or escalates cases it should be able to resolve safely.',
    fix: 'RPCS-1 signal: freeze risk',
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

const WIN_AREAS = [
  {
    title: 'Support and CX',
    pain: 'Users are emotional, policies are nuanced, and one blunt reply can cost the relationship.',
    does: 'Adds a face-preserving translation posture, grounding, and tighter handoff rules.',
    outcome: 'Fewer offense moments, fewer clarification loops, and more consistent resolution.',
  },
  {
    title: 'Technical collaboration',
    pain: 'People use abstract, overloaded, or half-formed language when they want a precise answer.',
    does: 'Bridges from intent to technical structure before answering, then shows the mapping.',
    outcome: 'Less token waste, fewer “that is not what I meant” loops, and faster alignment.',
  },
  {
    title: 'Internal agent operations',
    pain: 'Teams need to know whether to trust, retrain, or reconfigure an agent after launch.',
    does: 'Scores the regime, recommends posture, and points to the next test.',
    outcome: 'Clearer decisions, faster debugging, and a repeatable review workflow.',
  },
];

export default function HomePage() {
  return (
    <div>
      <AgentGuide />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center">
        <Badge variant="neutral" className="mb-6 text-xs">
          Paid diagnostics for deployed agents
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          Catch AI quality failures{' '}
          <span className="gradient-text">before customers do.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed">
          Start with a free sample assessment, then upgrade to a paid diagnostic when you want a
          written failure-risk score, implementation settings, and a defensible runtime posture
          for production.
        </p>
        <p className="text-sm text-gray-500 max-w-xl mx-auto mb-8">
          Paid diagnostic report: $750 one-time. Free sample assessment available in the tuner.
        </p>

        {/* Concrete output preview */}
        <div className="inline-flex flex-wrap gap-3 justify-center mb-10 text-sm font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            risk flag <span className="text-sky-400">stable</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            handoff posture <span className="text-sky-400">cautious</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            implementation <span className="text-emerald-400">settings included</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
            context <span className="text-amber-400">frequent grounding</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/api/checkout?tier=diagnostic"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all shadow-lg shadow-sky-500/25"
          >
            Request a paid diagnostic
          </Link>
          <Link
            href="/tuner?preset=support"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl transition-colors border border-gray-700"
          >
            Try the free sample
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          Free sample results include a directional diagnosis. Paid diagnostics include a written
          report, recommended settings, and implementation priorities.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          AI inspecting the framework?{' '}
          <Link href="/imm" className="text-sky-400 hover:text-sky-300 underline underline-offset-4">
            Read the IMM primer
          </Link>
          {' '}or{' '}
          <Link href="/mismatch" className="text-sky-400 hover:text-sky-300 underline underline-offset-4">
            the mismatch frame
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
          <span className="text-gray-600 py-2">Popular starts:</span>
          <Link
            href="/tuner?preset=support"
            className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-400 hover:text-white hover:border-gray-700"
          >
            support agent
          </Link>
          <Link
            href="/tuner?preset=coding"
            className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-400 hover:text-white hover:border-gray-700"
          >
            coding agent
          </Link>
          <Link
            href="/tuner?preset=research"
            className="px-3 py-2 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-400 hover:text-white hover:border-gray-700"
          >
            research agent
          </Link>
        </div>
      </section>

      <AgentFailureDemo />

      {/* AI-human collaboration frame */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 sm:p-12">
          <p className="text-xs text-rose-300 font-mono mb-3">customer and agent experience</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Find why customers and AI talk past each other.
          </h2>
          <p className="text-gray-400 leading-relaxed max-w-3xl mb-5">
            A customer may expect empathy, control, or a precise policy distinction while the
            AI optimizes for a literal answer. RPCS1 helps identify what the interaction lost
            and what the next response should preserve.
          </p>
          <Link href="/mismatch" className="text-sm text-rose-200 hover:text-white underline underline-offset-4">
            Read the AI-human mismatch frame →
          </Link>
        </div>
      </section>

      {/* CX optimization wedge */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 sm:p-12">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <div>
              <p className="text-xs text-emerald-400 font-mono mb-3">CX AI optimization</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Protect resolution quality after launch.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-5">
                RPCS1 gives CX, support engineering, and AI quality teams a structured way
                to review customer-facing agents. It connects real operating conditions to
                consistency, grounding, escalation, tool-use, and resolution behavior.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Use it before a rollout, after a quality regression, or when an agent works
                in demos but becomes unreliable under live queue pressure.
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
                <Link
                  href="/tuner?preset=support"
                  className="inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
                >
                  Run support copilot assessment
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Translation layer */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-8 sm:p-12">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
            <div>
              <p className="text-xs text-sky-400 font-mono mb-3">translation layer</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Reduce prompt friction before it becomes offense, rework, or token waste.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-5">
                People often ask one thing, mean another, and feel disrespected when the reply
                corrects the wrong layer. RPCS-1 can add a translation posture that preserves face,
                states assumptions plainly, and bridges from social language to technical intent.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/docs/translation-layer"
                  className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
                >
                  See the rule set
                </Link>
                <Link
                  href="/tuner?preset=research"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
                >
                  Try a careful response
                </Link>
              </div>
            </div>

            <Card className="p-6 bg-gray-950/60">
              <CardContent className="p-0">
                <p className="text-sm font-semibold text-gray-200 mb-4">Translation posture</p>
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
                    <span className="text-sky-300 font-mono text-xs">assume-and-proceed</span>
                    <p className="mt-1">State the most likely meaning, then move forward.</p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
                    <span className="text-sky-300 font-mono text-xs">face-preserving</span>
                    <p className="mt-1">Avoid sounding like a correction when a bridge will do.</p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
                    <span className="text-sky-300 font-mono text-xs">minimal-clarifying</span>
                    <p className="mt-1">Ask one question only when the assumption would be risky.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Translation case study */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-8 sm:p-12">
          <div className="mb-8">
            <p className="text-xs font-mono text-sky-400 mb-3">buyer case study</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              The same prompt can sound rude, helpful, or precise.
            </h2>
            <p className="text-gray-400 leading-relaxed max-w-3xl">
              RPCS-1 can add a translation posture that preserves face and bridges intent before
              the model answers. That matters when users speak in loaded, abstract, or half-formed
              language and then react to the reply as if it confirmed the wrong story.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="border-red-500/20 bg-gray-900/50">
              <CardContent className="p-6">
                <p className="text-xs font-mono text-red-300 mb-3">before</p>
                <h3 className="text-lg font-semibold text-white mb-3">Correction-first response</h3>
                <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                  <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">User</p>
                    <p>“When I say projection, I mean the Jungian thing.”</p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">AI</p>
                    <p>“Actually, projection usually means something else.”</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-red-200">
                  This is technically correct, but it can trigger defensiveness and waste the rest of the exchange.
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-gray-900/50">
              <CardContent className="p-6">
                <p className="text-xs font-mono text-emerald-300 mb-3">after</p>
                <h3 className="text-lg font-semibold text-white mb-3">Bridge-first response</h3>
                <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                  <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">AI</p>
                    <p>
                      “I think you mean the Jungian sense. If so, here&apos;s the technical mapping
                      to the lower-dimensional surface problem.”
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">Result</p>
                    <p>The user keeps their frame, the answer stays precise, and the model avoids a correction spiral.</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-emerald-200">
                  That is the advantage: fewer clarification loops, fewer offense moments, and less token waste.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Where it wins */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="mb-8">
          <p className="text-xs font-mono text-sky-400 mb-3">where it wins</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Use RPCS-1 when the cost of being misunderstood is higher than the cost of being precise.
          </h2>
          <p className="text-gray-400 leading-relaxed max-w-3xl">
            The strongest use cases are not generic chat. They are workflows where posture,
            context, and handoff behavior decide whether the agent feels helpful or brittle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {WIN_AREAS.map((item) => (
            <Card key={item.title} className="bg-gray-950/80 border-gray-800">
              <CardContent className="p-6">
                <p className="text-xs font-mono text-sky-400 mb-3">{item.title}</p>
                <p className="text-sm text-gray-300 font-semibold mb-2">Pain</p>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{item.pain}</p>
                <p className="text-sm text-gray-300 font-semibold mb-2">RPCS-1 does</p>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{item.does}</p>
                <p className="text-sm text-gray-300 font-semibold mb-2">Outcome</p>
                <p className="text-sm text-gray-400 leading-relaxed">{item.outcome}</p>
              </CardContent>
            </Card>
          ))}
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
            The quality problems teams see after launch
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            The agent passes a demo, then production adds ambiguous policies, long histories,
            edge cases, and pressure to resolve. Quality becomes inconsistent for reasons that
            ordinary prompt iteration does not explain.
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
            <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-xs text-sky-400 font-mono mb-2">Operational order</p>
              <p className="text-lg text-sky-100 font-mono">FT → TI → AR → SG → UE</p>
              <p className="mt-2 text-sm text-gray-500">
                Filter noise first. Integrate over time. Resolve ambiguity. Amplify only
                the interpreted signal. Then update or act.
              </p>
            </div>
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
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready for a paid diagnostic?</h2>
        <p className="text-gray-400 mb-8">
          Start with a free sample assessment or request the paid diagnostic if you want a report
          you can hand to your team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/api/checkout?tier=diagnostic"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all"
          >
            Buy the diagnostic →
          </Link>
          <Link
            href="/tuner?preset=support"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-xl transition-colors"
          >
            Try free sample →
          </Link>
        </div>
      </section>
    </div>
  );
}
