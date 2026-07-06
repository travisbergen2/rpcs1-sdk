'use client';

import Link from 'next/link';
import { HomepageLiveDemo } from '@/components/HomepageLiveDemo';

const memoBullets = [
  {
    title: 'Five-primitive profile',
    body: 'TI, SG, FT, UE, and AR measured for one configured agent — the measurement coordinates of the three blocks.',
  },
  {
    title: 'Failure-risk score',
    body: 'A fast read on whether the workflow looks stable, oscillating, overloaded, or frozen.',
  },
  {
    title: 'Recommended posture',
    body: 'The runtime settings you should actually change before rollout — temperature, context strategy, tool-use posture.',
  },
  {
    title: 'Next test',
    body: 'A concrete follow-up check that tells you whether the configuration improved.',
  },
];

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

export default function HomePage() {
  return (
    <div className="bg-[#070b14] text-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(14,165,233,0.13),transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
              Receiver laws derived from observer requirements — IMM Paper 18
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Agent settings that are{' '}
              <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                derived, not guessed.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              RPCS-1 turns your agent&apos;s operating conditions — entropy, stakes, predictability,
              context horizon — into the runtime settings it needs and the failure mode it&apos;s
              closest to. The recommendations come from receiver laws derived in the IMM research
              program, not from vibes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tuner?preset=support"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_8px_32px_rgba(14,165,233,0.35)] transition-colors hover:bg-sky-400"
              >
                Run the free tuner
              </Link>
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3.5 text-base font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
              >
                Get the $99 founding diagnostic
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/45">
              Free results are directional. The paid diagnostic adds a written memo: profile,
              recommended settings, implementation priorities, and the next test to run.
            </p>
          </div>

          <HomepageLiveDemo />
        </div>
      </section>

      {/* ── The framework underneath ─────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
              The framework underneath
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Three blocks every bounded observer is forced to implement
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/65">
              IMM Paper 18 rebuilds the RPCS-1 foundations from the minimal requirements for
              being an observer at all: estimate a changing quantity from noisy observations,
              act on it under time constraints. Under those named assumptions, what boundedness
              forces is three coupled functional blocks — and the five RPCS-1 primitives are the
              measurement coordinates laid over them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {blocks.map((b, i) => (
              <div
                key={b.name}
                className="group relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
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

          {/* Matching laws strip */}
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

      {/* ── What the diagnostic gives you ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
              What the memo gives you
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              A clear answer, the right settings, one next test
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {memoBullets.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                >
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0a101d] p-6">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-amber-300">
              Sample output
            </p>
            <div className="mt-4 rounded-xl border border-white/8 bg-black/40 p-5 font-mono text-sm leading-7 text-white/80">
              <p>
                <span className="text-sky-300">status:</span> stable
              </p>
              <p>
                <span className="text-sky-300">receiver profile:</span> TI 78 · SG 61 · FT 43 · UE 66 · AR 22
              </p>
              <p>
                <span className="text-sky-300">configuration:</span> explicit_confirmation · frequent_grounding
              </p>
              <p>
                <span className="text-sky-300">language mode:</span> face-preserving
              </p>
              <p>
                <span className="text-sky-300">best next check:</span> rerun 3 ambiguous cases
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              You don&apos;t need the theory lecture to use it. You need to know whether the agent
              is stable enough to ship, what to change, and which test confirms the fix.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                See pricing
              </Link>
              <Link
                href="/diagnostic"
                className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
              >
                Submit a brief
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Translator Hub ────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
                Free tool
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">RPCS-1 Translator Hub</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
                The same receiver framework, pointed at human communication: interpret ambiguous
                messages, normalize fragmented text, split mixed intents, rewrite for any audience
                — and calibrate output to an individual&apos;s receiver profile, not a lumped
                &quot;style.&quot;
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'Interpret', body: 'Detect ambiguity, extract intent, assess confidence' },
                  { title: 'Rewrite', body: 'Tuned to a receiver profile, or 6 fixed styles' },
                  { title: 'Calibrate', body: '5-item intake → your profile, plus a self-vs-observed mirror' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-xs font-mono text-sky-300">{item.title}</p>
                    <p className="mt-1 text-sm text-white/60">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/translator"
                  className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                >
                  Open Translator Hub
                </Link>
                <Link
                  href="/docs/translation-layer"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                >
                  Protocol docs
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/40 p-5 font-mono text-sm leading-7">
              <p className="mb-3 text-xs text-sky-300">{'// Live example — ambiguous input'}</p>
              <p>
                <span className="text-white/30">$</span> curl -X POST /api/translate{' '}
                <span className="text-emerald-300">{`{"tool":"interpret","text":"I'm fine","risk":"advice"}`}</span>
              </p>
              <p className="mt-2 text-white/40">{'{'}</p>
              <p className="ml-4 text-white/40">
                ar_level: <span className="text-amber-300">&quot;AR5&quot;</span>,
              </p>
              <p className="ml-4 text-white/40">
                ambiguities: <span className="text-amber-300">[&quot;neutral&quot;, &quot;frustrated&quot;]</span>,
              </p>
              <p className="ml-4 text-white/40">
                margin: <span className="text-amber-300">0.015</span>,
              </p>
              <p className="ml-4 text-white/40">
                suggested: <span className="text-amber-300">&quot;clarify&quot;</span>
              </p>
              <p className="text-white/40">{'}'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Buy path ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl border border-sky-500/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(255,176,0,0.06))] p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-300">Buy path</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Start free. Upgrade when one workflow needs a clear answer.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
                Most teams don&apos;t need a bigger theory. They need to know whether their agent
                is stable enough to ship, what to change, and which test will confirm the fix.
                That&apos;s what the diagnostic is for.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/tuner?preset=support"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
              >
                Run the free tuner
              </Link>
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300"
              >
                Get the $99 founding diagnostic
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                Compare plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
