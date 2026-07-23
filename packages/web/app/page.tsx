'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PRIMITIVES } from '@/lib/primitives';
import { PROFILES } from '@/lib/profiles';
import { useProfile } from '@/components/ProfileProvider';
import { ProfileChooser } from '@/components/ProfileChooser';

// Code-split the two interactive widgets out of the initial hydration bundle.
// SSR stays on (default), so the server-rendered HTML is identical and there is
// no layout shift — only their JS arrives as separate async chunks, which cuts
// main-thread work before first paint on slow devices (the sessions that
// dominate field FCP/LCP percentiles).
const HomepageLiveDemo = dynamic(() =>
  import('@/components/HomepageLiveDemo').then((m) => m.HomepageLiveDemo),
);
const ProfileCompare = dynamic(() =>
  import('@/components/ProfileCompare').then((m) => m.ProfileCompare),
);

const failureKnobs = {
  Oscillation: 'Agility and Gain set too high for how noisy the task actually is.',
  Overload: 'Memory holding too much, Trigger set too loose.',
  Freeze: 'Commit bar set too high for the actual stakes.',
} as const;

export default function HomePage() {
  const { profile } = useProfile();
  const c = PROFILES[profile];
  const failureModes = [
    { name: 'Oscillation' as const, tell: c.tells.oscillation },
    { name: 'Overload' as const, tell: c.tells.overload },
    { name: 'Freeze' as const, tell: c.tells.freeze },
  ];
  return (
    <div className="bg-[#070b14] text-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(14,165,233,0.13),transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
              {c.hero.kicker}
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {c.hero.h1}{' '}
              <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                {c.hero.accent}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              {c.hero.sub}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tuner?preset=support"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_8px_32px_rgba(14,165,233,0.35)] transition-colors hover:bg-sky-400"
              >
                Check your agent free
              </Link>
              <Link
                href="/pricing#diagnostic"
                className="inline-flex items-center justify-center rounded-xl px-2 py-3.5 text-base font-semibold text-amber-300/90 underline-offset-4 transition-colors hover:text-amber-200 hover:underline"
              >
                Founding diagnostic — first 3 free →
              </Link>
            </div>
            <p className="mt-3 text-xs text-white/40">No account. About a minute. Free to rerun.</p>
            <p className="mt-2 text-xs text-white/40">
              New:{' '}
              <Link href="/repaste" className="text-sky-300/90 underline underline-offset-4 hover:text-sky-200">
                Repaste
              </Link>{' '}
              — paste it rough, copy it right. Pick who&apos;s reading; your prompt arrives the way you meant it.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/45">
              The free check takes about a minute and is directional. The diagnostic adds a
              written memo: what to change, in what order, and the test that proves it worked.{' '}
              <Link href="/rd" className="text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white/85">
                Every number traces to a derived law — including the checks that failed.
              </Link>
            </p>
          </div>

          <HomepageLiveDemo />
        </div>
      </section>

      {/* ── Failure modes ────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
              The problem
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {c.failHeading}
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {failureModes.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
              >
                <h3 className="text-xl font-semibold text-sky-300">{m.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{m.tell}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/45">
                  <span className="font-semibold text-white/60">Usually:</span>{' '}
                  {failureKnobs[m.name]}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/50">
            {c.failIntro}{' '}
            <Link href="/rd" className="text-sky-400 underline-offset-4 hover:underline">
              See the derivation →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Exactly what you get ─────────────────────────────── */}
      <section id="what-you-get" className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
              Exactly what you get
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Know what you&apos;re buying — and what it changes in your workflow
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">Free tuner</h3>
                <span className="font-mono text-sm text-white/40">$0 · no account</span>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/65">
                <li className="flex gap-3">
                  <span className="mt-0.5 text-sky-400">→</span>
                  Your agent’s five-dial profile — Memory, Gain, Trigger, Agility, Commit — for
                  one described workload
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-sky-400">→</span>
                  Which failure mode it’s closest to: stable, oscillation, overload, or freeze
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-sky-400">→</span>
                  Runtime settings to paste: temperature, max_tokens, context and tool-use strategy
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-sky-400">→</span>
                  The reasoning behind every number — nothing is a vibe
                </li>
              </ul>
              <p className="mt-5 border-t border-white/8 pt-4 text-sm leading-relaxed text-white/45">
                <span className="font-semibold text-white/70">In your workflow:</span> a 60-second
                check before you ship a config change. Directional, deterministic, free to rerun.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold text-amber-300">Founding diagnostic</h3>
                <span className="font-mono text-sm text-white/40">first 3 free · then $99</span>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/65">
                <li className="flex gap-3">
                  <span className="mt-0.5 text-amber-400">→</span>
                  Five dials measured for one configured agent, with a failure-risk score
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-amber-400">→</span>
                  The runtime settings to change before rollout, in priority order
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-amber-400">→</span>
                  One named follow-up test — so you know within a session whether the fix worked
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 text-amber-400">→</span>
                  A written memo your team can act on: a checklist, not a research project
                </li>
              </ul>
              <p className="mt-5 border-t border-white/8 pt-4 text-sm leading-relaxed text-white/45">
                <span className="font-semibold text-white/70">In your workflow:</span> apply the
                settings, run the named test, know by tomorrow — instead of guessing across a
                week of prompt edits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Five dials ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
            The model
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Five dials, not fifty flags.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/65">
            Every agent runtime — any model, any framework — reduces to five settings. RPCS-1
            reads your workload and sets each one.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRIMITIVES.map((p) => (
            <div
              key={p.key}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
            >
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                {p.abbr} · {p.scientific}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{p.gloss}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/40">{p.plain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Translator ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
            RPCS-1 Translator
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            The same engine, pointed at people.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/65">
            You say it once. It lands the way each reader needs to hear it.
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed text-white/65">
            <li className="flex gap-3"><span className="mt-0.5 text-sky-400">→</span>Untangle a message that could mean three different things</li>
            <li className="flex gap-3"><span className="mt-0.5 text-sky-400">→</span>Turn fragmented notes into something you can actually send</li>
            <li className="flex gap-3"><span className="mt-0.5 text-sky-400">→</span>Split a mixed request into its separate asks</li>
            <li className="flex gap-3"><span className="mt-0.5 text-sky-400">→</span>Rewrite anything for the specific person receiving it — their profile, not a generic “style”</li>
          </ul>
          <Link
            href="/translator"
            className="mt-7 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
          >
            Try the Translator →
          </Link>
        </div>
      </section>

      <ProfileChooser />
      <ProfileCompare />

      {/* ── Trust strip ──────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-2xl border border-sky-500/15 bg-[linear-gradient(180deg,rgba(14,165,233,0.07),transparent)] p-6 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              You can trust the numbers because we publish the misses.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/55">
              Every recommendation traces to a law that was checked numerically against criteria
              fixed <em>before</em> the data was generated. Three registered checks failed during
              development — one corrected and re-run, one cut from the claims entirely, one
              traced to an artifact. All three are reported in full, because a scorecard you can
              trust has to include the misses.
            </p>
            <Link
              href="/rd"
              className="mt-6 inline-flex items-center text-sm font-semibold text-sky-400 underline-offset-4 hover:underline"
            >
              The research &amp; the full scorecard →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Is your agent stable enough to ship?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60">
          Most teams don’t need a bigger theory. They need to know what to change and which test
          confirms the fix.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/tuner?preset=support"
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_8px_32px_rgba(14,165,233,0.35)] transition-colors hover:bg-sky-400"
          >
            Check your agent free
          </Link>
          <Link
            href="/pricing#diagnostic"
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3.5 text-base font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
          >
            Founding diagnostic — first 3 free
          </Link>
        </div>
      </section>
    </div>
  );
}
