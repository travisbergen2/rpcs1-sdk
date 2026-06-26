import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { HomepageLiveDemo } from '@/components/HomepageLiveDemo';

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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-8 items-start">
          <div className="text-left">
            <Badge variant="neutral" className="mb-6 text-xs">
              AI quality diagnostics for deployed agents
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 max-w-3xl">
              Know why one agent will{' '}
              <span className="gradient-text">fail before rollout.</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mb-6 leading-relaxed">
              RPCS-1 tells you whether one workflow is likely to fail, what to change, and what to test next.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              {[
                { title: 'What it is', body: 'A diagnostic for one deployed agent or workflow.' },
                { title: 'Who it is for', body: 'Teams shipping support, AI, and ops agents.' },
                { title: 'Why it is better', body: 'Less guesswork, clearer next steps, faster rollout decisions.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                  <p className="text-xs font-mono text-sky-400 mb-2">{item.title}</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/tuner?preset=support"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all shadow-lg shadow-sky-500/20"
              >
                Start free
              </Link>
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-lg shadow-amber-500/25"
              >
                Request paid diagnostic
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-600 max-w-xl">
              Free sample results are directional. Paid diagnostics include a written report,
              recommended settings, implementation priorities, and a next test to run.
            </p>
            <p className="mt-3 text-xs text-gray-500 max-w-xl">
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
          </div>

          <HomepageLiveDemo />
        </div>
      </section>

      {/* Proof-style signal */}
      <section id="proof-signal" className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-5 items-stretch">
          <Card className="border-sky-500/20 bg-sky-500/5">
            <CardContent className="p-6 sm:p-8">
              <p className="text-xs font-mono text-sky-400 mb-3">proof signal</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                The advantage is not softer wording. It is fewer failed assumptions.
              </h2>
              <div className="rounded-2xl border border-sky-500/20 bg-gray-950/70 p-5 mb-5">
                <p className="text-xs font-mono text-sky-300 mb-2">What a pilot usually reveals</p>
                <blockquote className="text-lg sm:text-xl text-gray-100 leading-relaxed">
                  “Correct, but in the wrong frame.”
                </blockquote>
              </div>
              <p className="text-gray-400 leading-relaxed">
                RPCS-1 turns that into a repeatable review: state the assumption, preserve the user&apos;s frame, and move toward the answer without triggering a correction spiral.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {[
              {
                title: 'Less clarification churn',
                body: 'The system proposes the most likely meaning once, then proceeds instead of looping on “what did you mean?”',
              },
              {
                title: 'More usable corrections',
                body: 'When the reply needs to be precise, it still lands in a way the user can hear without losing face.',
              },
              {
                title: 'Cleaner handoffs',
                body: 'The output includes posture and next-test guidance, so teams can decide whether to adjust, retrain, or escalate.',
              },
            ].map((item) => (
              <Card key={item.title} className="bg-gray-950/80 border-gray-800">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-white mb-2">{item.title}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-32">
        <div className="relative overflow-hidden rounded-[2rem] border border-sky-500/20 bg-[#050814] p-6 sm:p-8 lg:p-10">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 20%, rgba(56,189,248,0.22), transparent 30%), radial-gradient(circle at 20% 80%, rgba(168,85,247,0.15), transparent 22%), radial-gradient(circle at 80% 75%, rgba(16,185,129,0.12), transparent 22%)',
            }}
          />
          <div className="relative">
            <div className="mb-6">
              <p className="text-xs font-mono text-sky-400 mb-3">sales room</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                The site gets more immersive as you scroll down.
              </h2>
              <p className="text-gray-400 leading-relaxed max-w-3xl">
                Clarity comes first. Proof comes next. The deeper you go, the more the interface turns
                into an operating room for buying, inspecting, and rolling out the system.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] items-stretch" style={{ perspective: '1600px' }}>
              <div className="relative rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_24px_120px_rgba(0,0,0,0.55)] transform-gpu lg:translate-y-4 lg:[transform:rotateX(10deg)_rotateY(8deg)]">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_28%)]" />
                <p className="text-xs font-mono text-amber-400 mb-3">conversation</p>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">What are you trying to build today?</h3>
                <p className="text-gray-300 leading-relaxed mb-5">
                  Start free with a live assessment, then upgrade to a written diagnostic when the
                  workflow needs a decision memo, implementation settings, and a next test.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Link
                    href="/tuner?preset=support"
                    className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500/15 transition-colors"
                  >
                    Start free
                  </Link>
                  <Link
                    href="/api/checkout?tier=diagnostic"
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/15 transition-colors"
                  >
                    Buy the diagnostic
                  </Link>
                  <Link
                    href="mailto:travisbergen2@gmail.com?subject=RPCS-1 Demo"
                    className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 transition-colors"
                  >
                    Book a demo
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    title: 'Buy path',
                    body: 'Free sample, paid diagnostic, team rollout.',
                    accent: 'amber',
                  },
                  {
                    title: 'Proof path',
                    body: 'Before / after, benchmarks, and a live demo.',
                    accent: 'sky',
                  },
                  {
                    title: 'Room state',
                    body: 'As you scroll, the interface deepens instead of flattening out.',
                    accent: 'emerald',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-2xl shadow-[0_18px_90px_rgba(0,0,0,0.42)] transform-gpu lg:[transform:rotateX(12deg)_rotateY(-10deg)]"
                  >
                    <p className={`text-xs font-mono mb-2 ${item.accent === 'amber' ? 'text-amber-400' : item.accent === 'sky' ? 'text-sky-400' : 'text-emerald-400'}`}>
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
