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
        <div className="relative overflow-hidden rounded-[2rem] border border-sky-500/20 bg-[#03060e] p-4 sm:p-6 lg:p-8">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 18%, rgba(56,189,248,0.24), transparent 24%), radial-gradient(circle at 18% 82%, rgba(168,85,247,0.14), transparent 18%), radial-gradient(circle at 82% 80%, rgba(16,185,129,0.14), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 28%, rgba(255,255,255,0.02) 72%, transparent 100%)',
            }}
          />
          <div className="relative h-[52rem] sm:h-[56rem] [perspective:1700px]">
            <div className="absolute inset-0 translate-y-[14%] [transform-style:preserve-3d]">
              <div className="absolute left-1/2 top-[58%] h-[24rem] w-[33rem] -translate-x-1/2 rounded-[2rem] border border-cyan-300/20 bg-[#09111d] shadow-[0_30px_100px_rgba(0,0,0,0.55)] [transform:translateZ(-120px)_rotateX(74deg)]">
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.16),transparent_25%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.12),transparent_18%)]" />
                <div className="absolute inset-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:2.8rem_2.8rem]" />
              </div>
              <div className="absolute left-1/2 top-[28%] h-[23rem] w-[33rem] -translate-x-1/2 rounded-[2rem] border border-sky-300/15 bg-[#0b1321] shadow-[0_20px_80px_rgba(0,0,0,0.45)] [transform:translateZ(-40px)_rotateX(0deg)]">
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.18),transparent_22%),radial-gradient(circle_at_14%_86%,rgba(168,85,247,0.12),transparent_18%),radial-gradient(circle_at_84%_86%,rgba(16,185,129,0.10),transparent_18%)]" />
                <div className="absolute inset-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:2.8rem_2.8rem]" />
              </div>
              <div className="absolute left-1/2 top-[24%] h-[15rem] w-[11rem] -translate-x-1/2 rounded-[1.75rem] border border-cyan-300/25 bg-[#07131d] shadow-[0_0_60px_rgba(56,189,248,0.22)] [transform:translateZ(100px)_translateX(-50%)_rotateX(4deg)]">
                <div className="absolute inset-3 rounded-[1.15rem] border border-cyan-200/20 bg-[#091624]" />
                <div className="absolute left-1/2 top-7 h-5 w-5 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_24px_rgba(103,232,249,0.95)]" />
                <div className="absolute left-1/2 top-[5.5rem] h-2 w-14 -translate-x-1/2 rounded-full bg-emerald-300/80" />
                <div className="absolute left-1/2 bottom-6 h-2 w-16 -translate-x-1/2 rounded-full bg-white/30" />
              </div>
              <div className="absolute left-[16%] top-[31%] h-[6rem] w-[8rem] rounded-[1.25rem] border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.38)] [transform:translateZ(35px)_rotateY(18deg)]">
                <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-sky-400/20 to-transparent" />
                <div className="absolute inset-3 rounded-[1rem] border border-white/10 bg-[#0f1726]" />
                <div className="absolute left-3 top-3 rounded-full bg-sky-400/15 px-2 py-1 text-[10px] font-mono text-sky-300">scanner</div>
                <p className="absolute bottom-3 left-3 text-xs text-white/80">Live tuner</p>
              </div>
              <div className="absolute right-[14%] top-[26%] h-[6rem] w-[9rem] rounded-[1.25rem] border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.38)] [transform:translateZ(45px)_rotateY(-18deg)]">
                <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-amber-400/20 to-transparent" />
                <div className="absolute inset-3 rounded-[1rem] border border-white/10 bg-[#0f1726]" />
                <div className="absolute left-3 top-3 rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-mono text-amber-300">$750 memo</div>
                <p className="absolute bottom-3 left-3 text-xs text-white/80">Written diagnostic</p>
              </div>
              <div className="absolute left-[10%] bottom-[18%] h-[6rem] w-[8.5rem] rounded-[1.25rem] border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.38)] [transform:translateZ(26px)_rotateY(16deg)]">
                <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-emerald-400/18 to-transparent" />
                <div className="absolute inset-3 rounded-[1rem] border border-white/10 bg-[#0f1726]" />
                <div className="absolute left-3 top-3 rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-mono text-emerald-300">portal</div>
                <p className="absolute bottom-3 left-3 text-xs text-white/80">MCP access</p>
              </div>
              <div className="absolute right-[9%] bottom-[16%] h-[6rem] w-[8.5rem] rounded-[1.25rem] border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.38)] [transform:translateZ(32px)_rotateY(-14deg)]">
                <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-fuchsia-400/18 to-transparent" />
                <div className="absolute inset-3 rounded-[1rem] border border-white/10 bg-[#0f1726]" />
                <div className="absolute left-3 top-3 rounded-full bg-fuchsia-400/15 px-2 py-1 text-[10px] font-mono text-fuchsia-300">prism</div>
                <p className="absolute bottom-3 left-3 text-xs text-white/80">Translation layer</p>
              </div>
              <div className="absolute left-1/2 top-[42%] h-[8rem] w-[8rem] -translate-x-1/2 rounded-[1.6rem] border border-cyan-300/30 bg-[#09141f] shadow-[0_0_60px_rgba(56,189,248,0.35)] [transform:translateZ(120px)_translateX(-50%)_rotateX(8deg)]">
                <div className="absolute inset-3 rounded-[1.1rem] border border-cyan-200/20 bg-[#07111a]" />
                <div className="absolute left-1/2 top-6 h-4 w-4 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.95)]" />
                <div className="absolute left-[28%] top-11 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                <div className="absolute right-[28%] top-11 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                <div className="absolute left-1/2 bottom-6 h-2 w-9 -translate-x-1/2 rounded-full bg-emerald-300/70" />
              </div>
              <div className="absolute inset-x-0 bottom-[7%] flex justify-center">
                <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.28em] text-white/60 backdrop-blur-md">
                  3d showroom / artifacts floating in space
                </div>
              </div>
            </div>
          </div>
          <div className="relative -mt-10 flex justify-center pb-4 sm:pb-0">
            <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-[#07111a]/90 p-3 shadow-[0_18px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:grid-cols-3">
              <Link href="/tuner?preset=support" className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500/15">
                Start free
              </Link>
              <Link href="/api/checkout?tier=diagnostic" className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15">
                Buy memo
              </Link>
              <Link href="mailto:travisbergen2@gmail.com?subject=RPCS-1 Demo" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15">
                Book demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
