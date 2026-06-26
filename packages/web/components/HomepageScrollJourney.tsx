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
    label: '1999',
    title: 'Browser shell',
    body: 'Flat page. Blue links. Zero mystery.',
    detail: 'The interface still behaves like the old web.',
  },
  {
    key: 'bridge',
    label: 'bridge',
    title: 'The page starts reasoning',
    body: 'Panels lift off the surface and connect.',
    detail: 'Signals, assumptions, and handoffs become visible.',
  },
  {
    key: 'room',
    label: '2050',
    title: '3D sales room',
    body: 'Avatar, artifacts, and a buy path in space.',
    detail: 'The offer becomes a room you can stand inside.',
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
          <p className="mb-3 inline-flex rounded border border-black/20 bg-white px-2 py-1 text-[10px] font-mono uppercase tracking-[0.24em] text-black/60">
            best viewed in 800x600
          </p>
          <h3 className="max-w-md text-3xl font-black leading-[0.95] tracking-tight">
            One agent. One
            <span className="text-[#1266ff]"> decision memo.</span>
          </h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'what it is', body: 'A diagnostic for one deployed workflow.' },
              { title: 'who it is for', body: 'Teams shipping support, coding, and ops agents.' },
              { title: 'what next', body: 'Run free, then buy the memo.' },
            ].map((item) => (
              <div key={item.title} className="rounded border border-black/15 bg-white/80 p-3">
                <p className="text-[11px] font-mono text-[#1266ff]">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-black/75">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 rounded-[1.25rem] border border-black/10 bg-white/65 p-3 text-[11px] font-mono text-black/65 sm:grid-cols-3">
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2">link: start free</div>
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2">link: buy memo</div>
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2">link: book demo</div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-[1.1rem] border border-black/10 bg-white/70 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.24em] text-black/55">
            <span>visitors: 000421</span>
            <span>56k mode</span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-black/15 bg-[#2b2c31] p-4 text-white shadow-[0_22px_90px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] font-mono text-sky-400">live demo</p>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-lg font-semibold">The browser becomes the machine.</p>
            <p className="mt-2 text-sm text-white/60">
              Pick a preset and watch the page lift into signal, posture, and next check.
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
          <p className="text-[11px] font-mono text-sky-400">bridge</p>
          <h3 className="mt-2 text-2xl font-semibold">The page starts lifting off the surface.</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/60 max-w-md">
            Old browser parts become signals, assumptions, and handoffs.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['assumptions', 'signals', 'handoffs'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70"
              >
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
  const artifacts = [
    {
      title: 'Scanner',
      body: 'Live tuner',
      accent: 'sky',
      className: 'left-[10%] top-[18%]',
      transform: 'rotateX(14deg) rotateY(-18deg)',
    },
    {
      title: 'Memo',
      body: '$750 written diagnostic',
      accent: 'amber',
      className: 'right-[11%] top-[17%]',
      transform: 'rotateX(16deg) rotateY(16deg)',
    },
    {
      title: 'Portal',
      body: 'MCP access',
      accent: 'emerald',
      className: 'left-[8%] bottom-[16%]',
      transform: 'rotateX(18deg) rotateY(-10deg)',
    },
    {
      title: 'Prism',
      body: 'Translation layer',
      accent: 'fuchsia',
      className: 'right-[8%] bottom-[14%]',
      transform: 'rotateX(18deg) rotateY(12deg)',
    },
  ] as const;

  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#040711] text-white shadow-[0_32px_140px_rgba(0,0,0,0.65)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 18%, rgba(56,189,248,0.28), transparent 24%), radial-gradient(circle at 24% 84%, rgba(168,85,247,0.18), transparent 18%), radial-gradient(circle at 80% 78%, rgba(16,185,129,0.16), transparent 18%), linear-gradient(135deg, rgba(255,255,255,0.05), transparent 34%, rgba(255,255,255,0.03) 68%, transparent 100%)',
        }}
      />
      <div className="relative grid h-full gap-4 p-4 sm:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl shadow-[0_24px_100px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] font-mono text-amber-400">sales room</p>
          <h3 className="mt-2 text-2xl font-semibold">The room closes the sale.</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            The product is no longer a page. It is a place with objects you can inspect.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
        <div className="relative rounded-[1.6rem] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_50%_65%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_18%)]" />
          <div className="relative grid h-full gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10 shadow-[0_0_70px_rgba(56,189,248,0.24)]">
                  <div className="relative h-[5.5rem] w-[5.5rem] rounded-[1.7rem] border border-cyan-200/25 bg-[#06111d] shadow-[0_0_28px_rgba(56,189,248,0.4)]">
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

            <div className="relative min-h-[22rem] rounded-[1.6rem] border border-white/10 bg-[#06111d] p-4 shadow-[0_24px_100px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.18),transparent_22%),radial-gradient(circle_at_20%_76%,rgba(168,85,247,0.14),transparent_18%),radial-gradient(circle_at_78%_70%,rgba(16,185,129,0.12),transparent_18%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60" />
              <div className="relative h-full">
                <div className="absolute left-1/2 top-10 h-20 w-px -translate-x-1/2 bg-gradient-to-b from-sky-300/80 via-sky-300/30 to-transparent" />
                <div className="absolute left-1/2 top-7 h-5 w-5 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_28px_rgba(103,232,249,0.85)]" />

                {artifacts.map((artifact) => (
                  <div
                    key={artifact.title}
                    className={`absolute ${artifact.className} h-[4.5rem] w-[8.5rem] rounded-[1.4rem] border border-white/10 bg-white/5 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)]`}
                    style={{ transform: artifact.transform }}
                  >
                    <p
                      className={`text-[10px] font-mono ${
                        artifact.accent === 'sky'
                          ? 'text-sky-300'
                          : artifact.accent === 'amber'
                            ? 'text-amber-300'
                            : artifact.accent === 'emerald'
                              ? 'text-emerald-300'
                              : 'text-fuchsia-300'
                      }`}
                    >
                      {artifact.title.toLowerCase()}
                    </p>
                    <p className="mt-1 text-xs text-white/75">{artifact.body}</p>
                  </div>
                ))}

                <div className="absolute left-1/2 top-1/2 h-[7.5rem] w-[7.5rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem] border border-cyan-300/25 bg-[#07131d] shadow-[0_0_38px_rgba(56,189,248,0.22)]" style={{ transform: 'translate(-50%, -50%) rotateX(14deg) rotateY(-8deg)' }}>
                  <div className="absolute left-5 top-7 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                  <div className="absolute right-5 top-7 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                  <div className="absolute left-1/2 bottom-6 h-2 w-10 -translate-x-1/2 rounded-full bg-emerald-300/70" />
                </div>
              </div>
            </div>
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
          Flat web first. Spatial room last.
        </h2>
        <p className="text-gray-400 leading-relaxed">
          The page upgrades itself as you move, so the interface explains the product by changing
          what it is.
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
            <span className="ml-2 uppercase tracking-[0.22em]">browser → bridge → room</span>
          </div>
          {scene}
          <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/80 p-4 text-sm text-gray-400 leading-relaxed">
            {active === 'browser' && 'Flat page. The old web is still in control.'}
            {active === 'bridge' && 'The interface starts lifting, wiring, and translating.'}
            {active === 'room' && 'The pitch becomes a room with objects and a path to buy.'}
          </div>
        </div>
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
