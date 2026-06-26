'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

type StageKey = 'browser' | 'bridge' | 'room';

const STAGES: Array<{
  key: StageKey;
  label: string;
  title: string;
  body: string;
  detail: string;
}> = [
  {
    key: 'browser',
    label: 'stage 1',
    title: 'Classic 1999 web shell',
    body: 'Flat, legible, and familiar.',
    detail: 'You know what RPCS-1 is, who it is for, and what to do next before the page mutates.',
  },
  {
    key: 'bridge',
    label: 'stage 2',
    title: 'The interface starts reasoning',
    body: 'The browser dissolves into a signal field.',
    detail: 'Connections appear, assumptions get labeled, and the user sees the machine think.',
  },
  {
    key: 'room',
    label: 'stage 3',
    title: 'Face to face with the sales room',
    body: 'The scroll ends in a premium room with an avatar and artifacts.',
    detail: 'What they buy is concrete: a written memo, runtime settings, and the next test to run.',
  },
];

function BrowserScene() {
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-black/15 bg-[#d7d7d4] text-black shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-black/10 bg-[#efefef] px-4 py-2.5 text-[11px] font-mono text-black/65">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="inline-flex h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="inline-flex h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 tracking-[0.18em]">RPCS-1 Research Browser</span>
        </div>
        <span>1999</span>
      </div>
      <div className="grid h-[calc(100%-2.3rem)] gap-4 p-4 sm:grid-cols-[1.06fr_0.94fr]">
        <div className="rounded-[1.6rem] border border-black/10 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="mb-4 inline-flex rounded border border-black/20 bg-white px-2 py-1 text-[10px] font-mono uppercase tracking-[0.24em] text-black/60">
            AI quality diagnostics for deployed agents
          </p>
          <h3 className="max-w-md text-3xl font-black leading-[0.95] tracking-tight">
            Know why one agent will <span className="text-[#1266ff]">fail before rollout.</span>
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-black/70">
            RPCS-1 tells you whether one workflow is likely to fail, what to change, and what to test next.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'What it is', body: 'A diagnostic for one deployed workflow.' },
              { title: 'Who it is for', body: 'Teams shipping support, AI, and ops agents.' },
              { title: 'Why it is better', body: 'Less guesswork, clearer next steps, faster rollout decisions.' },
            ].map((item) => (
              <div key={item.title} className="rounded border border-black/15 bg-white/80 p-3">
                <p className="text-[11px] font-mono text-[#1266ff]">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-black/75">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#1266ff]/20 bg-[#1266ff]/10 px-3 py-1 text-[11px] font-mono text-[#1266ff]">
              Start free
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1 text-[11px] font-mono text-amber-700">
              Buy the diagnostic
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1 text-[11px] font-mono text-emerald-700">
              Book a demo
            </span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-black/15 bg-[#2b2c31] p-4 text-white shadow-[0_22px_90px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] font-mono text-sky-400">live demo</p>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-lg font-semibold">Try one workflow in under a minute.</p>
            <p className="mt-2 text-sm text-white/60">
              Pick a preset, run RPCS-1, and see the status, configuration, language mode, and next check.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            {['Support copilot', 'Coding agent', 'Research agent'].map((item, index) => (
              <div
                key={item}
                className={cn(
                  'rounded-2xl border p-3',
                  index === 0 ? 'border-sky-400/50 bg-sky-500/15' : 'border-white/10 bg-white/5'
                )}
              >
                <p className="font-semibold text-white">{item}</p>
                <p className="mt-2 leading-relaxed text-white/45">
                  {index === 0
                    ? 'Refunds, billing disputes, and policy exceptions under queue pressure.'
                    : index === 1
                      ? 'Repo edits, tests, and pull requests in a changing codebase.'
                      : 'Long-context synthesis with a careful, bridge-first response.'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
              Status <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">stable</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
              Configuration <span className="ml-1 text-white">explicit_confirmation · frequent_grounding</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
              Language mode <span className="ml-1 text-amber-300">face-preserving</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
              Confidence <span className="ml-1 text-sky-300">high</span>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-[11px] font-mono text-amber-300">First warning</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              TI floor binding: the recommendation is deterministic, but should still be validated against traces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BridgeScene() {
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020] text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 18%, rgba(56,189,248,0.22), transparent 16%), radial-gradient(circle at 86% 22%, rgba(168,85,247,0.18), transparent 16%), radial-gradient(circle at 50% 72%, rgba(16,185,129,0.1), transparent 20%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 3.25rem 3.25rem, 3.25rem 3.25rem',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative grid h-full gap-4 p-4 sm:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <p className="text-[11px] font-mono text-sky-400">reasoning field</p>
          <h3 className="mt-2 text-2xl font-semibold">The interface starts translating the request.</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/60 max-w-md">
            The page is no longer a brochure. It is a live field where the system labels uncertainty and shows the next check.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['assumptions', 'signals', 'handoffs'].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="relative rounded-[1.6rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <p className="text-[11px] font-mono text-sky-400">signal graph</p>
          <div className="relative mt-4 h-[calc(100%-1.75rem)] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#06111d]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.22),transparent_18%),radial-gradient(circle_at_22%_76%,rgba(168,85,247,0.16),transparent_16%),radial-gradient(circle_at_78%_70%,rgba(16,185,129,0.12),transparent_16%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
            <div className="absolute left-1/2 top-14 h-32 w-px bg-gradient-to-b from-sky-300/80 via-sky-300/40 to-transparent" />
            <div className="absolute left-1/2 top-10 h-5 w-5 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_28px_rgba(103,232,249,0.85)]" />
            <div className="absolute left-[20%] top-[36%] h-4 w-4 rounded-full bg-fuchsia-300 shadow-[0_0_20px_rgba(232,121,249,0.9)]" />
            <div className="absolute right-[19%] top-[33%] h-4 w-4 rounded-full bg-fuchsia-300 shadow-[0_0_20px_rgba(232,121,249,0.9)]" />
            <div className="absolute left-[27%] top-[43%] h-16 w-16 rounded-[1.35rem] border border-fuchsia-400/20 bg-fuchsia-500/10 blur-[0.4px]" />
            <div className="absolute right-[24%] top-[40%] h-16 w-16 rounded-[1.35rem] border border-fuchsia-400/20 bg-fuchsia-500/10 blur-[0.4px]" />
            <div className="absolute left-1/2 top-[48%] h-24 w-24 -translate-x-1/2 rounded-[1.6rem] border border-cyan-300/25 bg-[#07131d] shadow-[0_0_30px_rgba(56,189,248,0.22)]">
              <div className="absolute left-5 top-7 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
              <div className="absolute right-5 top-7 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
              <div className="absolute left-1/2 bottom-6 h-2 w-10 -translate-x-1/2 rounded-full bg-emerald-300/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomScene() {
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#040711] text-white shadow-[0_32px_140px_rgba(0,0,0,0.65)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 18%, rgba(56,189,248,0.28), transparent 24%), radial-gradient(circle at 24% 84%, rgba(168,85,247,0.18), transparent 18%), radial-gradient(circle at 80% 78%, rgba(16,185,129,0.16), transparent 18%), linear-gradient(135deg, rgba(255,255,255,0.05), transparent 34%, rgba(255,255,255,0.03) 68%, transparent 100%)',
        }}
      />
      <div className="relative grid h-full gap-4 p-4 sm:grid-cols-[1fr_0.88fr]">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl shadow-[0_24px_100px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] font-mono text-amber-400">conversation</p>
          <h3 className="mt-2 text-2xl font-semibold">What are you trying to build today?</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            Start free, then step up to the written diagnostic when the workflow needs a decision memo, runtime settings, and a next test.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link href="/tuner?preset=support" className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500/15">
              Start free
            </Link>
            <Link href="/api/checkout?tier=diagnostic" className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15">
              Buy the diagnostic
            </Link>
            <Link href="mailto:travisbergen2@gmail.com?subject=RPCS-1 Demo" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15">
              Book a demo
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_50%_65%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_18%)]" />
            <div className="relative">
              <p className="text-[11px] font-mono text-sky-400 mb-2">ai avatar</p>
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_70px_rgba(56,189,248,0.26)]">
                <div className="relative h-20 w-20 rounded-[1.5rem] border border-cyan-200/25 bg-[#06111d] shadow-[0_0_28px_rgba(56,189,248,0.4)]">
                  <div className="absolute left-5 top-6 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                  <div className="absolute right-5 top-6 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                  <div className="absolute left-1/2 bottom-5 h-2 w-9 -translate-x-1/2 rounded-full bg-emerald-300/70" />
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
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_18px_90px_rgba(0,0,0,0.42)]"
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
  );
}

export function HomepageScrollJourney() {
  const [active, setActive] = useState<StageKey>('browser');
  const markers = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observed = markers.current.filter(Boolean) as HTMLDivElement[];
    if (!observed.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const next = visible.target.getAttribute('data-stage') as StageKey | null;
        if (next) setActive(next);
      },
      {
        root: null,
        threshold: [0.35, 0.5, 0.65, 0.8],
        rootMargin: '-10% 0px -20% 0px',
      }
    );

    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scene =
    active === 'browser' ? <BrowserScene /> : active === 'bridge' ? <BridgeScene /> : <RoomScene />;

  return (
    <section id="proof-signal" className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-mono text-sky-400 mb-3">scroll journey</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          The page starts like a 1999 browser and turns into a sales room as you scroll.
        </h2>
        <p className="text-gray-400 leading-relaxed">
          The interface is built to transform around the user. First it feels familiar and flat, then it starts reasoning, then it puts the agent in a room with the deliverables on display.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          {STAGES.map((stage, index) => (
            <div
              key={stage.key}
              ref={(node) => {
                markers.current[index] = node;
              }}
              data-stage={stage.key}
              className="min-h-[66vh] flex items-start"
            >
              <Card
                className={cn(
                  'w-full border transition-all duration-500',
                  active === stage.key
                    ? 'border-sky-500/40 bg-sky-500/10 shadow-[0_20px_80px_rgba(56,189,248,0.12)]'
                    : 'border-gray-800 bg-gray-950/80 opacity-80'
                )}
              >
                <CardContent className="p-6 sm:p-7">
                  <p className="text-xs font-mono text-sky-400 mb-3">{stage.label}</p>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">{stage.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{stage.body}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{stage.detail}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="sticky top-24 self-start">
          <div className="mb-3 flex items-center gap-2 text-xs font-mono text-gray-500">
            <span className={cn('h-2 w-2 rounded-full transition-colors', active === 'browser' ? 'bg-[#1266ff]' : 'bg-gray-700')} />
            <span className={cn('h-2 w-2 rounded-full transition-colors', active === 'bridge' ? 'bg-[#1266ff]' : 'bg-gray-700')} />
            <span className={cn('h-2 w-2 rounded-full transition-colors', active === 'room' ? 'bg-[#1266ff]' : 'bg-gray-700')} />
            <span className="ml-2 uppercase tracking-[0.22em]">environment shift</span>
          </div>
          {scene}
          <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/80 p-4 text-sm text-gray-400 leading-relaxed">
            {active === 'browser' && 'The interface is still flat and familiar. The value is visible before the motion starts.'}
            {active === 'bridge' && 'The page begins translating intent into structure, and the user sees the system thinking.'}
            {active === 'room' && 'The scroll resolves into a pitch room: avatar, artifacts, and a clear buying path.'}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
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

      <div className="mt-8 flex justify-center">
        <Link
          href="#sales-room"
          className="inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/15"
        >
          Enter the room ↓
        </Link>
      </div>
    </section>
  );
}
