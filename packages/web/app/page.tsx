'use client';

import Link from 'next/link';
import { HomepageLiveDemo } from '@/components/HomepageLiveDemo';

const memoBullets = [
  {
    title: 'Five-primitive profile',
    body: 'TI, SG, FT, UE, and AR measured for one configured agent.',
  },
  {
    title: 'Failure-risk score',
    body: 'A fast read on whether the workflow looks stable, oscillating, overloaded, or frozen.',
  },
  {
    title: 'Recommended posture',
    body: 'The runtime settings you should actually change before rollout.',
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
                Five-primitive battery for deployed agents
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-black sm:text-5xl lg:text-6xl">
                Measure why one agent will{' '}
                <span className="text-[#1266ff]">fail before rollout.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-black/75">
                RPCS-1 turns task, entropy, stakes, predictability, context horizon, and commitment style into a
                five-primitive profile, a failure-risk score, and a next test for one configured agent.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'What it measures', body: 'One configured agent, five primitives, one failure-risk read.' },
                  { title: 'Who it is for', body: 'Teams shipping support, coding, research, and workflow agents.' },
                  { title: 'What it catches', body: 'Overload, oscillation, freeze, and underdetermination.' },
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
                  Get the $99 founding pilot
                </Link>
              </div>

              <p className="mt-4 max-w-xl text-xs leading-relaxed text-black/60">
                Free results are directional. The paid diagnostic includes a written memo, five-primitive profile,
                recommended settings, implementation priorities, and a next test to run.
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
                <span className="text-sky-300">receiver profile:</span> TI 78 · SG 61 · FT 43 · UE 66 · AR 22
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

      {/* Translator Hub section */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-[2rem] border border-sky-500/15 bg-[linear-gradient(180deg,rgba(18,102,255,0.08),rgba(99,102,241,0.04))] p-6 sm:p-8 shadow-[0_24px_100px_rgba(0,0,0,0.35)]">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400 mb-3">free tool</p>
              <h2 className="text-3xl font-bold text-white mb-3">RPCS-1 Translator Hub</h2>
              <p className="text-base leading-relaxed text-white/75 max-w-2xl mb-4">
                Interpret ambiguous messages, normalize fragmented text, split mixed intents, rewrite
                for any audience, and score candidate interpretations — all powered by the HF-HATP v1.9
                protocol.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {[
                  { title: 'Interpret', body: 'Detect ambiguity, extract intent, assess confidence' },
                  { title: 'Rewrite', body: '6 styles: plain, technical, gentle, concise, detailed, direct' },
                  { title: 'Score', body: 'RPCS-1 Signature Ambiguity Framework with AR scale' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-mono text-sky-300">{item.title}</p>
                    <p className="mt-1 text-sm text-white/65">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/translator"
                  className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
                >
                  Open Translator Hub
                </Link>
                <Link
                  href="/docs/translation-layer"
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Protocol docs
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-black/30 p-5 font-mono text-sm">
              <p className="text-xs text-sky-300 mb-3">{"// Live example — ambiguous input"}</p>
              <p><span className="text-gray-500">{"$"}</span> curl -X POST /api/translate <span className="text-emerald-300">{`{"tool":"interpret","text":"I'm fine","risk":"advice"}`}</span></p>
              <p className="mt-2 text-gray-400">{"{"}</p>
              <p className="ml-3 text-gray-400">ar_level: <span className="text-amber-300">{"\"AR5\""}</span><span className="text-gray-600">,</span></p>
              <p className="ml-3 text-gray-400">ambiguities: <span className="text-amber-300">{"[\"neutral\", \"frustrated\"]"}</span><span className="text-gray-600">,</span></p>
              <p className="ml-3 text-gray-400">margin: <span className="text-amber-300">0.015</span><span className="text-gray-600">,</span></p>
              <p className="ml-3 text-gray-400">suggested: <span className="text-amber-300">{"\"clarify\""}</span></p>
              <p className="text-gray-400">{"}"}</p>
            </div>
          </div>
        </div>
      </section>
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
                Get the $99 founding pilot
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
