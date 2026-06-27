'use client';

import Link from 'next/link';
import { HomepageLiveDemo } from '@/components/HomepageLiveDemo';

const memoBullets = [
  {
    title: 'Failure-risk score',
    body: 'A fast read on whether the workflow looks stable, cautious, oscillating, or overloaded.',
  },
  {
    title: 'Recommended posture',
    body: 'The runtime settings you should actually change before rollout.',
  },
  {
    title: 'Implementation priorities',
    body: 'What matters first so the team can ship improvements without guesswork.',
  },
  {
    title: 'Next test',
    body: 'A concrete follow-up check that tells you whether the configuration improved.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#05060a] text-white">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-sky-500/15 bg-[#c9c9c9] text-black shadow-[0_35px_120px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-[#efefef] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-mono text-black/70">
              <span className="inline-flex h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="inline-flex h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="inline-flex h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-2">RPCS-1 Research Browser</span>
            </div>
            <div className="hidden items-center gap-3 text-xs font-mono text-black/60 sm:flex">
              <Link href="/pricing" className="hover:text-black">
                Pricing
              </Link>
              <Link href="/diagnostic" className="hover:text-black">
                Diagnostic
              </Link>
              <Link href="/docs" className="hover:text-black">
                Docs
              </Link>
            </div>
          </div>

          <div className="grid gap-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.56),_transparent_42%)] px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.06fr_0.94fr]">
            <div className="text-left">
              <p className="mb-4 inline-flex rounded border border-black/20 bg-white/70 px-2 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                AI quality diagnostics for deployed agents
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-black sm:text-5xl lg:text-6xl">
                Know why one agent will{' '}
                <span className="text-[#1266ff]">fail before rollout.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-black/75">
                RPCS-1 gives you a free sample read, then a written diagnostic for one workflow so your team can
                change the right settings before production gets messy.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'What it is', body: 'A diagnostic for one deployed agent or workflow.' },
                  { title: 'Who it is for', body: 'Teams shipping support, AI, and ops agents.' },
                  { title: 'Why it is better', body: 'Less guesswork, clearer next steps, faster rollout decisions.' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded border border-black/20 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                  >
                    <p className="text-xs font-mono text-[#1266ff]">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-black/75">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/tuner?preset=support"
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#1266ff] px-6 py-3 text-base font-semibold text-white shadow-[0_8px_20px_rgba(18,102,255,0.22)] transition-colors hover:bg-[#0f57d4]"
                >
                  Start free
                </Link>
                <Link
                  href="/api/checkout?tier=diagnostic"
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#ffb000] px-6 py-3 text-base font-semibold text-black shadow-[0_8px_20px_rgba(255,176,0,0.24)] transition-colors hover:bg-[#ff9d00]"
                >
                  Buy $750 diagnostic
                </Link>
              </div>

              <p className="mt-4 max-w-xl text-xs leading-relaxed text-black/60">
                Free results are directional. The paid diagnostic includes a written memo, recommended settings,
                implementation priorities, and a next test to run.
              </p>
            </div>

            <HomepageLiveDemo />
          </div>
        </div>
      </section>

      <section id="proof-signal" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.8rem] border border-white/10 bg-[#09111d] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)]">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">What the memo gives you</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {memoBullets.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-[#0b1320] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)]">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-amber-300">Sample output</p>
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-black/30 p-5 font-mono text-sm text-white/80">
              <p>
                <span className="text-sky-300">status:</span> stable
              </p>
              <p className="mt-2">
                <span className="text-sky-300">configuration:</span> explicit_confirmation · frequent_grounding
              </p>
              <p className="mt-2">
                <span className="text-sky-300">language mode:</span> face-preserving
              </p>
              <p className="mt-2">
                <span className="text-sky-300">best next check:</span> rerun 3 ambiguous cases
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Buyers do not need a theory lecture. They need a clear answer, the right settings, and one next
              test that makes the workflow safer to ship.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                See pricing
              </Link>
              <Link
                href="/diagnostic"
                className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
              >
                Submit a brief
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-[2rem] border border-sky-500/15 bg-[linear-gradient(180deg,rgba(18,102,255,0.12),rgba(255,176,0,0.08))] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.4)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-300">Buy path</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Start free. Upgrade when one workflow needs a clear answer.</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
                Most teams do not need a bigger theory. They need to know whether their agent is stable enough to
                ship, what to change, and which test will confirm the fix. That is what the diagnostic is for.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <Link
                href="/tuner?preset=support"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-300"
              >
                Run the free tuner
              </Link>
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300"
              >
                Buy the $750 diagnostic
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
