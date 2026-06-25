import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IMM / RPCS-1 Primer for AI Agents',
  description:
    'A concise IMM primer for RPCS-1 receiver dynamics, gate order, failure modes, and AI agent pre-tuning.',
};

const GATES = [
  ['FT', 'Filtering Threshold', 'Filter noise first.'],
  ['TI', 'Temporal Integration', 'Integrate over time.'],
  ['AR', 'Ambiguity Resolution', 'Resolve ambiguity.'],
  ['SG', 'Signal Gain', 'Amplify only the interpreted signal.'],
  ['UE', 'Update Elasticity', 'Then update or act.'],
];

const FAILURE_MODES = [
  ['oscillation', 'The receiver keeps revisiting the same evidence and cannot settle.'],
  ['overload', 'Too much signal gets through and weak evidence drives action.'],
  ['freeze', 'The receiver resists updates and stalls when it should act.'],
  ['mismatch', 'The receiver profile does not preserve the distinctions the task needs.'],
];

export default function ImmPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <p className="text-xs font-mono text-sky-400 mb-3">AI-readable IMM primer</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-5">
          IMM → RPCS-1 → AI Agent Pre-Tuning
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          IMM treats observation as compression: a receiver cannot carry every environmental
          distinction forward. RPCS-1 turns that idea into five tuning gates for deployed agents.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">One-Pass Summary</h2>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`IMM -> many-to-one collapse -> receiver/environment matching
    -> five gates -> AI pre-tuning

FT -> TI -> AR -> SG -> UE`}
        </pre>
      </section>

      <section className="grid gap-4 mb-8">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">What the framework says</h2>
          <p className="text-gray-400 leading-relaxed">
            Matching happens when the receiver preserves the distinctions needed for the task.
            In practice that means the environment determines how much history to keep, how much
            to filter, how quickly to commit, and how readily to update.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">The five gates</h2>
          <div className="grid gap-3">
            {GATES.map(([abbr, label, plain]) => (
              <div key={abbr} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="font-mono text-sky-300">{abbr}</p>
                <p className="text-white font-semibold">{label}</p>
                <p className="text-sm text-gray-400">{plain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Failure modes</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FAILURE_MODES.map(([name, description]) => (
            <div key={name} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
              <h3 className="font-mono text-sm text-amber-300 mb-2">{name}</h3>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Why it matters for AI agents</h2>
        <p className="text-gray-400 leading-relaxed">
          A support copilot under live queue pressure needs different filtering, context, and
          commitment behavior than a stable research agent. RPCS-1 is the pre-tuning layer that
          translates operating conditions into a receiver profile before teams reach for prompt
          edits or blind parameter sweeps.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Next</h2>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/tuner" className="text-sky-400 hover:text-sky-300">Interactive tuner</Link> — run a concrete recommendation.</li>
          <li><Link href="/pricing#diagnostic" className="text-sky-400 hover:text-sky-300">Paid diagnostic</Link> — get a written report for your team.</li>
          <li><Link href="/docs/primitives" className="text-sky-400 hover:text-sky-300">Five primitives</Link> — TI, SG, FT, UE, AR.</li>
        </ul>
      </section>
    </div>
  );
}
