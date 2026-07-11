import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Translation Bridge — the receiver laws, pointed at you | RPCS-1',
  description:
    'The RPCS-1 Translation Bridge applies the derived receiver model (IMM Paper 18) to human communication: a five-primitive profile over the three observer blocks, compiled into deterministic rendering directives for any AI agent. Unrelated to RPCS3, the PlayStation 3 emulator.',
  alternates: { canonical: 'https://rpcs1.dev/bridge' },
  openGraph: {
    title: 'RPCS-1 Translation Bridge — the receiver laws, pointed at you',
    description:
      'The same derived receiver model that tunes agents, pointed at human communication. Calibrate a profile; every AI renders for you.',
    url: 'https://rpcs1.dev/bridge',
    type: 'website',
  },
};

const blocks = [
  {
    n: '01',
    keys: 'TI · UE',
    name: 'Estimate',
    machine: 'How much history to keep, how fast to update.',
    human:
      'How much context you need before the point lands (TI), and how readily you revise when pushed back on (UE). The bridge renders structure and revision posture to match — bottom line first for a low-TI reader, full context first for a high-TI one.',
  },
  {
    n: '02',
    keys: 'SG · FT',
    name: 'Detect',
    machine: 'One alarm channel, two knobs: gain and criterion.',
    human:
      'How much tone you read into a message (SG), and how explicit it must be before subtext registers (FT). A high-FT reader gets intent stated outright — no idiom, no hints. That is not a deficit; it is a criterion setting.',
  },
  {
    n: '03',
    keys: 'AR',
    name: 'Commit',
    machine: 'Accumulate evidence to a bound, then act.',
    human:
      'When an answer should commit versus surface the options (AR). A high-AR profile gets the best reading picked and answered; a low-AR profile gets the alternatives laid out before anything is locked in.',
  },
];

const features = [
  {
    t: 'Behavioral calibration',
    badge: 'Live',
    good: true,
    href: '/calibrate',
    d: 'Five forced-choice questions — one per primitive — place you continuously on the five axes. Never a category label: ASD, ADHD, and AuDHD are regions of the same continuous space, not three boxes. Answers stay in your tab.',
  },
  {
    t: 'ReceiverProfile JSON',
    badge: 'In SDK',
    good: true,
    href: '/v1/receiver-profile.json',
    d: 'Your profile exports as clean, versioned JSON with deterministic rendering directives — portable to any AI agent or LLM workflow. Schema published at /v1/receiver-profile.json.',
  },
  {
    t: 'Governed refinement + masking mirror',
    badge: 'In SDK',
    good: true,
    href: null,
    d: 'The quick intake is a noisy prior. It refines from real interaction at a rate governed by your own UE — and the gap between where you set yourself and where your messages actually land (your masking shape) is surfaced back to you, never silently acted on.',
  },
  {
    t: 'Privacy-tiered data control',
    badge: 'Roadmap',
    good: false,
    href: null,
    d: 'Tiered partitioning — Core Card, Working Profile, Private Archive — so profiles stay safe across public and enterprise endpoints. Designed; not yet shipped.',
  },
];

const ledger = [
  {
    tag: 'Derived',
    cls: 'bg-emerald-400/10 text-emerald-300',
    d: 'The three-block receiver model and its matching laws are derived under named assumptions from standard optimality theory (IMM Paper 18) — checked against pre-registered numerical criteria, with the failures reported and cut.',
  },
  {
    tag: 'Registered',
    cls: 'bg-amber-400/10 text-amber-300',
    d: 'That a five-item intake usefully predicts a human’s communication preferences is a registered, testable hypothesis. The human-side validation battery is pre-registered with pass/fail criteria fixed before data generation — and has not yet been run. Results will be published either way.',
  },
  {
    tag: 'Open',
    cls: 'bg-white/10 text-white/60',
    d: 'Whether in-context AI receivers can self-tune these parameters from conversation statistics alone is an open, testable question. The bridge externalizes the parameters so you don’t have to bet on the answer.',
  },
];

export default function BridgePage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white antialiased">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <header className="border-b border-white/5 py-20">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-sky-400">
            Translation Bridge · the receiver laws, pointed at you
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            AI that adapts to your cognitive style — not the other way around.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            RPCS-1 turns an agent&apos;s operating conditions into derived runtime settings. The
            bridge is the same model pointed the other way: <em>you</em> are the receiver. Five
            questions place you on the five primitives; the result compiles into deterministic
            rendering directives any AI can obey — instead of a system prompt it will skim and
            forget.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/calibrate"
              className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
            >
              Calibrate your profile
            </Link>
            <Link
              href="/translator"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Open Translator Hub
            </Link>
            <Link
              href="/imm"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              The framework
            </Link>
          </div>
        </header>

        {/* Three blocks */}
        <section className="border-b border-white/5 py-20">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-sky-400">
            The framework underneath
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Three blocks every bounded observer is forced to implement — including you
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
            IMM Paper 18 derives what any bounded system must do to estimate a changing world from
            noisy signals and act in time: <span className="text-white">estimate → detect →
            commit</span>. The five primitives are the measurement coordinates over those blocks.
            An agent is one such observer. A human reading a message is another. The bridge
            measures your coordinates and renders for them.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {blocks.map((b, i) => (
              <div key={b.n} className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-xs text-white/30">{b.n}</p>
                  <p className="font-mono text-xs text-sky-300">{b.keys}</p>
                </div>
                <h3 className="mt-2 text-xl font-bold">{b.name}</h3>
                <p className="mt-2 text-sm text-white/50">{b.machine}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{b.human}</p>
                {i < 2 && (
                  <span
                    aria-hidden
                    className="absolute -right-4 top-1/2 hidden -translate-y-1/2 font-mono text-white/25 md:block"
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-white/50">
            Same blocks, same laws, different receiver. That is the whole trick — and why the
            profile is coordinates on a derived chart, not a personality quiz.{' '}
            <Link href="/imm" className="text-sky-400 hover:underline">
              Read the framework →
            </Link>
          </p>
        </section>

        {/* Problem framing */}
        <section className="border-b border-white/5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">
            The problem with prompting a mind-reader
          </h2>
          <p className="mt-4 max-w-2xl text-base text-white/65">
            System prompts describe you in prose and hope. The bridge replaces the hope with
            parameters — the same move the tuner makes for agents.
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-white/8">
            <div className="grid grid-cols-1 border-b border-white/8 md:grid-cols-2">
              <p className="p-4 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                Standard prompting
              </p>
              <p className="p-4 font-mono text-xs uppercase tracking-[0.2em] text-sky-400">
                The bridge
              </p>
            </div>
            {[
              [
                'Static instructions',
                'Long system prompts get skimmed, diluted, or overridden as context grows.',
                'Structured receiver profiles',
                'Preferences compile into explicit, versioned rendering directives that survive context growth.',
              ],
              [
                'Implicit adaptation',
                'You rely on the model to infer your communication parameters from conversation statistics — a design premise we state as a testable prediction, not a finding, is that this inference is unreliable.',
                'External parameter-setting',
                'Structure, warmth, explicitness, revision posture, and ambiguity handling are set as explicit knobs, outside the model’s discretion.',
              ],
              [
                'Cognitive friction',
                'Exploratory probes get read as factual claims; executive-function load gets read as disinterest.',
                'Precision translation',
                'Claims are tagged separately from probes; evidence is separated from speculation; intent survives the channel.',
              ],
            ].map(([lt, ld, rt, rd]) => (
              <div key={lt} className="grid grid-cols-1 border-b border-white/8 last:border-b-0 md:grid-cols-2">
                <div className="p-5">
                  <p className="font-semibold">{lt}</p>
                  <p className="mt-1 text-sm text-white/55">{ld}</p>
                </div>
                <div className="bg-white/[0.03] p-5">
                  <p className="font-semibold">{rt}</p>
                  <p className="mt-1 text-sm text-white/55">{rd}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-white/5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">What ships today</h2>
          <p className="mt-4 text-base text-white/65">
            Each feature is labeled with its actual status. That&apos;s the house style.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <h3 className="flex flex-wrap items-center gap-2.5 font-semibold">
                  {f.t}
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      f.good
                        ? 'border-emerald-400/40 text-emerald-300'
                        : 'border-amber-400/40 text-amber-300'
                    }`}
                  >
                    {f.badge}
                  </span>
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/60">{f.d}</p>
                {f.href && (
                  <Link href={f.href} className="mt-3 inline-block text-sm text-sky-400 hover:underline">
                    {f.href} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Schema */}
        <section className="border-b border-white/5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">The schema, not the sales pitch</h2>
          <p className="mt-4 max-w-2xl text-base text-white/65">
            Five primitives, continuous [0,100] — never category labels. Directives derive
            deterministically from the profile; the profile is the source of truth.
          </p>
          <pre className="mt-8 overflow-x-auto rounded-2xl border border-white/8 bg-black/40 p-6 font-mono text-[13px] leading-relaxed text-sky-200">
{`{
  "$schema": "https://rpcs1.dev/v1/receiver-profile.json",
  "version": "1.0",
  "profile": { "TI": 20, "SG": 25, "FT": 80, "UE": 75, "AR": 75 },
  "directives": {
    "structure": "bluf",            // Estimate: bottom line first
    "warmth": "minimal",            // Detect: flat and factual
    "explicitness": "explicit_literal", // Detect: no idiom, no hints
    "revision": "open_challenge",   // Estimate: pushback welcome
    "ambiguity": "commit"           // Commit: pick a reading, answer
  },
  "meta": { "source": "intake", "generator": "@rpcs1/core" }
}`}
          </pre>
          <p className="mt-3 font-mono text-xs text-white/40">
            {'// matches ReceiverProfile + deriveRenderingDirectives in @rpcs1/core · schema: '}
            <a href="/v1/receiver-profile.json" className="text-sky-400 hover:underline">
              /v1/receiver-profile.json
            </a>
          </p>
        </section>

        {/* Grounding */}
        <section className="border-b border-white/5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">
            Grounding — at exactly its earned grade
          </h2>
          <p className="mt-4 max-w-2xl text-base text-white/65">
            Most AI products claim more evidence than they have. This one is built on a public
            claim ledger, and this page obeys it.
          </p>
          <div className="mt-8 rounded-2xl border border-white/8 border-l-2 border-l-sky-500 bg-white/[0.03] p-7">
            <ul>
              {ledger.map((l) => (
                <li key={l.tag} className="flex gap-3.5 border-t border-white/8 py-3.5 first:border-t-0">
                  <span
                    className={`mt-0.5 h-fit whitespace-nowrap rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${l.cls}`}
                  >
                    {l.tag}
                  </span>
                  <span className="text-sm leading-relaxed text-white/60">{l.d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-mono text-sm text-sky-400">
              {'// no claim exceeds its derivation'}
            </p>
          </div>
        </section>

        <footer className="flex flex-wrap justify-between gap-4 py-12 text-xs text-white/35">
          <p>
            RPCS-1 Translation Bridge · part of{' '}
            <Link href="/" className="text-sky-400 hover:underline">
              rpcs1.dev
            </Link>{' '}
            · MIT licensed · not affiliated with RPCS3 (the PlayStation 3 emulator)
          </p>
          <p>
            Built by Travis Bergen ·{' '}
            <a
              href="https://github.com/travisbergen2/rpcs1-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline"
            >
              travisbergen2/rpcs1-sdk
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
