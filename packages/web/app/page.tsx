import dynamic from 'next/dynamic';
import Link from 'next/link';
import { HomepageLiveDemo } from '@/components/HomepageLiveDemo';
import { HomepageScrollJourney } from '@/components/HomepageScrollJourney';

const AgentGuide = dynamic(
  () => import('@/components/AgentGuide').then((mod) => mod.AgentGuide),
  { loading: () => null }
);

export default function HomePage() {
  return (
    <div>
      <AgentGuide />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-sky-500/20 bg-[#c9c9c9] text-black shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-[#efefef] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-mono text-black/70">
              <span className="inline-flex h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="inline-flex h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="inline-flex h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-2">RPCS-1 Research Browser</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-black/60">
              <span>Home</span>
              <span>Docs</span>
              <span>Demo</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-8 items-start bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_40%)] px-5 sm:px-8 py-8 sm:py-10">
            <div className="text-left">
              <p className="mb-4 inline-flex rounded border border-black/20 bg-white/70 px-2 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                AI quality diagnostics for deployed agents
              </p>
              <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5 text-black">
                Know why one agent will{' '}
                <span className="text-[#1266ff]">fail before rollout.</span>
              </h1>
              <p className="text-lg text-black/75 max-w-2xl mb-6 leading-relaxed">
                RPCS-1 tells you whether one workflow is likely to fail, what to change, and what to test next.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 mb-8">
                {[
                  { title: 'What it is', body: 'A diagnostic for one deployed agent or workflow.' },
                  { title: 'Who it is for', body: 'Teams shipping support, AI, and ops agents.' },
                  { title: 'Why it is better', body: 'Less guesswork, clearer next steps, faster rollout decisions.' },
                ].map((item) => (
                  <div key={item.title} className="rounded border border-black/20 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <p className="text-xs font-mono text-[#1266ff] mb-2">{item.title}</p>
                    <p className="text-sm text-black/75 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
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
                  Request paid diagnostic
                </Link>
              </div>

              <p className="mt-4 text-xs text-black/60 max-w-xl">
                Free sample results are directional. Paid diagnostics include a written report,
                recommended settings, implementation priorities, and a next test to run.
              </p>
              <p className="mt-3 text-xs text-black/55 max-w-xl">
                AI inspecting the framework?{' '}
                <Link href="/imm" className="text-[#1266ff] hover:underline">
                  Read the IMM primer
                </Link>
                {' '}or{' '}
                <Link href="/mismatch" className="text-[#1266ff] hover:underline">
                  the mismatch frame
                </Link>
                .
              </p>
            </div>

            <HomepageLiveDemo />
          </div>
        </div>
      </section>

      <HomepageScrollJourney />

      {/* CTA */}
      <section id="sales-room" className="max-w-6xl mx-auto px-4 sm:px-6 pb-32">
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
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-2xl shadow-[0_18px_90px_rgba(0,0,0,0.42)] transform-gpu lg:[transform:rotateX(12deg)_rotateY(-10deg)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.18),transparent_25%),radial-gradient(circle_at_50%_65%,rgba(168,85,247,0.14),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.1),transparent_20%)]" />
                  <div className="relative">
                    <p className="text-xs font-mono text-sky-400 mb-2">ai avatar</p>
                    <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_60px_rgba(56,189,248,0.22)]">
                      <div className="relative h-20 w-20 rounded-[1.5rem] border border-cyan-200/25 bg-[#06111d] shadow-[0_0_24px_rgba(56,189,248,0.35)]">
                        <div className="absolute left-5 top-6 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                        <div className="absolute right-5 top-6 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                        <div className="absolute left-1/2 bottom-5 h-2 w-8 -translate-x-1/2 rounded-full bg-emerald-300/70" />
                      </div>
                    </div>
                    <p className="mt-3 text-center text-sm text-gray-300">
                      “Show me the workflow, the risk, and the next step.”
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      title: 'Written memo',
                      body: 'One workflow, one failure mode, one decision.',
                      accent: 'amber',
                    },
                    {
                      title: 'Runtime settings',
                      body: 'Posture, grounding, and tool-use guidance.',
                      accent: 'sky',
                    },
                    {
                      title: 'Next test',
                      body: 'The exact check to run before rollout.',
                      accent: 'emerald',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_18px_90px_rgba(0,0,0,0.42)] transform-gpu lg:[transform:rotateX(12deg)_rotateY(-10deg)]"
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
        </div>
      </section>
    </div>
  );
}
