import type { Metadata } from 'next';
import Link from 'next/link';
import { PRIMITIVES } from '@/lib/primitives';

export const metadata: Metadata = {
  title: 'R&D — the research behind RPCS-1',
  description:
    'The receiver framework underneath RPCS-1: three derived blocks, five primitives, pre-registered numerical checks (passes and failures alike), and the papers.',
};

const blocks = [
  {
    name: 'Estimate',
    primitives: 'TI · UE',
    law: 'How much history to keep, how fast to update. Derived law: integrate less and update faster when the world changes faster.',
  },
  {
    name: 'Detect',
    primitives: 'SG · FT',
    law: 'One alarm channel, two knobs. Derived law: turn gain up and liberalize the criterion as the change rate rises.',
  },
  {
    name: 'Commit',
    primitives: 'AR',
    law: 'Accumulate evidence to a bound, then act. Derived law: commit faster when the world changes faster — thresholds scale with stakes-to-urgency.',
  },
];

const matchingLaws = [
  ['Integrate less', 'shorter memory windows'],
  ['Update faster', 'higher learning rates'],
  ['Look more often', 'higher sampling rates'],
  ['Liberalize detection', 'lower alarm thresholds'],
  ['Commit sooner', 'lower evidence bounds'],
];

const scorecard = [
  ['Update-elasticity exponents (R-2)', '+0.667 / +0.5 / +0.5', '+0.651 / +0.496 / +0.454', 'PASS'],
  ['Sampling-rate exponents (R-3)', '+0.667 / +0.5 / +0.5', '+0.620 / +0.493 / +0.488', 'PASS'],
  ['Detection value (R-4): deaf receiver', 'interior optimum', 'deaf loses 3.2×', 'PASS'],
  ['Commitment stakes law (R-5)', 'slope ≈ 1', '0.977', 'PASS'],
  ['Criterion log-law slope (R-4)', '−0.51', '−0.33', 'FAIL — cut from claims'],
];

export default function RdPage() {
  return (
    <div className="bg-[#070b14] text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-20 sm:px-6">
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">R&amp;D</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          The research behind the product
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/65">
          RPCS-1&apos;s recommendations come from receiver laws derived in the IMM research
          program — an open, numbered paper series with a public claim ledger. This page is the
          technical layer: the framework, the derivations, the pre-registered checks (including
          the ones that failed), and the mapping between the product names on the site and the
          scientific names in the papers.
        </p>
      </section>

      {/* Name mapping */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Product names ↔ scientific names
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
          The site uses production names for the five receiver primitives. The papers, the SDK
          field names, and the API use the scientific identifiers. Same objects, two registers:
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.03] font-mono text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-3">Product name</th>
                <th className="px-4 py-3">Scientific name</th>
                <th className="px-4 py-3">SDK field</th>
                <th className="px-4 py-3">What it sets</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              {PRIMITIVES.map((p) => (
                <tr key={p.key} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                  <td className="px-4 py-3">{p.scientific} ({p.abbr})</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.key}</td>
                  <td className="px-4 py-3 text-white/55">{p.gloss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Framework */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
            The framework underneath
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
            Three blocks every bounded observer is forced to implement
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65">
            IMM Paper 18 rebuilds the RPCS-1 foundations from the minimal requirements for being
            an observer at all: estimate a changing quantity from noisy observations, act on it
            under time constraints. Under those named assumptions, what boundedness forces is
            three coupled functional blocks — and the five RPCS-1 primitives are the measurement
            coordinates laid over them.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {blocks.map((b, i) => (
              <div
                key={b.name}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs text-white/35">0{i + 1}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs text-sky-300">
                    {b.primitives}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{b.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{b.law}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-sky-500/15 bg-[linear-gradient(180deg,rgba(14,165,233,0.07),transparent)] p-6 sm:p-8">
            <p className="text-sm font-semibold text-sky-300">
              When the environment changes faster, every derived law moves the same way:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {matchingLaws.map(([law, gloss]) => (
                <span
                  key={law}
                  className="inline-flex items-baseline gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-white">{law}</span>
                  <span className="text-xs text-white/45">{gloss}</span>
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/50">
              Honest labels, kept honest: these are derived under named assumptions, with
              pre-registered numerical checks — three of which failed and are reported in full,
              with the repairs. The exact exponents are conditional on the environment class.
              That level of disclosure is the point.{' '}
              <Link href="/imm" className="text-sky-400 underline-offset-4 hover:underline">
                Read how the framework works →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Scorecard */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
          Tested before it was shipped
        </p>
        <h2 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
          Pre-registered checks, pass and fail alike
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65">
          Every law behind the recommendations was checked numerically against criteria fixed{' '}
          <em>before</em> the data was generated. Here&apos;s the scorecard — including what
          failed:
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.03] font-mono text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-3">Check</th>
                <th className="px-4 py-3">Predicted</th>
                <th className="px-4 py-3">Measured</th>
                <th className="px-4 py-3">Verdict</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              {scorecard.map(([check, pred, meas, verdict]) => (
                <tr key={check} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">{check}</td>
                  <td className="px-4 py-3 font-mono text-xs">{pred}</td>
                  <td className="px-4 py-3 font-mono text-xs">{meas}</td>
                  <td
                    className={`px-4 py-3 font-mono text-xs ${
                      verdict.startsWith('PASS') ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {verdict}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/50">
          Three registered checks failed during development; one was corrected and re-run, one is
          cut from the claims entirely, one was traced to a discretization artifact. All three
          are reported in the paper — because a scorecard you can trust has to include the
          misses.{' '}
          <Link href="/imm" className="text-sky-400 underline-offset-4 hover:underline">
            Full claim ledger →
          </Link>
        </p>
      </section>

      {/* Papers */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Go deeper</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href="/imm" className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]">
              <h3 className="font-semibold">The IMM research program</h3>
              <p className="mt-2 text-sm text-white/55">
                The open paper series the receiver laws are derived in, with its public claim
                ledger and status vocabulary.
              </p>
            </Link>
            <Link href="/docs/primitives" className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]">
              <h3 className="font-semibold">Primitive reference</h3>
              <p className="mt-2 text-sm text-white/55">
                The five primitives in full: definitions, measurement, and how each maps to
                runtime settings.
              </p>
            </Link>
            <Link href="/docs" className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]">
              <h3 className="font-semibold">SDK &amp; API docs</h3>
              <p className="mt-2 text-sm text-white/55">
                Getting started, MCP server, platform mappings, and worked examples.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
