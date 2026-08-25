'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { StickerLogo } from '@/components/StickerLogo';
import { BRAND_PROMISE } from '@/lib/brand';
import { useProfile } from '@/components/ProfileProvider';
import { PROFILES } from '@/lib/profiles';
import { LANDING_COPY } from '@/lib/landing-copy';

// Code-split the box out of the initial hydration bundle. SSR stays on, so
// the server-rendered HTML is identical and there is no layout shift — only
// its JS arrives as a separate async chunk (same pattern the previous
// landing used for its live demo).
const SendBox = dynamic(() =>
  import('@/components/SendBox').then((m) => m.default),
);

// Beat titles are static; their bodies come from the reading profile —
// the landing page is the product's own demo: same facts, read your way.
const BEAT_TITLES = ['Type like you talk', 'See what you said', 'Send the one you meant'] as const;

export default function HomePage() {
  const { profile } = useProfile();
  const copy = LANDING_COPY[profile];
  const registerLabel = PROFILES[profile].label;
  return (
    <div className="bg-[#070b14] text-white">
      {/* ── Hero: the sticker and the box ─────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,255,255,0.06),transparent)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-16 text-center sm:px-6">
          <div className="flex justify-center">
            <StickerLogo size="hero" />
          </div>
          <h1 className="mt-8 text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {BRAND_PROMISE}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            {copy.sub}
          </p>
          <p className="mt-4 text-xs text-sky-300/70">
            You&apos;re reading this page in the{' '}
            <span className="font-semibold text-sky-300">{registerLabel}</span>{' '}
            register — the &ldquo;Reading as&rdquo; switch in the header
            changes it. Same facts, read your way.
          </p>
          <p className="mt-2 text-xs text-white/60">
            Free. No account. Your words never leave the page until you send
            them.
          </p>
        </div>

        <div id="box" className="relative mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6">
          <SendBox />
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {BEAT_TITLES.map((title, i) => (
              <div
                key={title}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
              >
                <p className="font-mono text-sm text-white/50">{i + 1}</p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {copy.beats[i]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Both directions ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
            Both directions
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Misreads travel both ways. So does this.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <a
            href="#box"
            className="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
          >
            <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">
              Before you send ↑
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              The box above. See the forks in what you wrote, pick the reading
              you meant, send the version that lands.
            </p>
          </a>
          <Link
            href="/bridge"
            className="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
          >
            <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">
              After they reply →
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              The full Bridge: decode what a reply actually meant, and rewrite
              your next message for the specific person receiving it — their
              profile, not a generic &ldquo;style.&rdquo;
            </p>
          </Link>
        </div>
      </section>

      {/* ── For agents ────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
                For agents
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                The same engine, pointed at your AI.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Agents misread workloads the way people misread messages. The
                engine under the box also derives runtime settings — and names
                the failure mode it&apos;s preventing.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/tuner" className="text-sky-400 underline-offset-4 hover:underline">
                The agent tuner →
              </Link>
              <Link href="/docs/mcp" className="text-sky-400 underline-offset-4 hover:underline">
                MCP server for your agent stack →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] p-6 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            The research behind it — including the misses.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/55">
            Every recommendation traces to a law that was checked against
            criteria fixed <em>before</em> the data was generated. Three
            registered checks failed during development — all three are
            reported in full, because a scorecard you can trust has to include
            the misses.
          </p>
          <Link
            href="/rd"
            className="mt-6 inline-flex items-center text-sm font-semibold text-sky-400 underline-offset-4 hover:underline"
          >
            The research &amp; the full scorecard →
          </Link>
        </div>
      </section>

      {/* ── Your notes, in every AI ───────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
              Your notes
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Your notes, in every AI you use.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Your Obsidian vault — or any folder of notes — becomes memory
              your AI can actually use, without leaving your machine. Nothing
              is readable until you choose folders; every answer shows exactly
              which notes it used; and anything the AI saves lands back in
              your vault as an ordinary note, linked to its sources, visible
              in your graph. Works in Claude Desktop, Claude Code, Cursor, and
              anything else that speaks the open connector standard (MCP).
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
              <a
                href="https://github.com/travisbergen2/rpcs1-sdk/tree/main/packages/vault-mcp"
                className="text-sky-400 underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Set it up (five minutes) →
              </a>
              <Link href="/labs" className="text-white/60 underline-offset-4 hover:text-white hover:underline">
                Everything else lives in Labs →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
