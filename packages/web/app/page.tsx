'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Homepage3DShowroom } from '@/components/Homepage3DShowroom';
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
      <Homepage3DShowroom />
    </div>
  );
}
