import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RPCS-1 Translation Bridge — AI that adapts to your cognitive style',
  description:
    'The RPCS-1 Translation Bridge compiles your communication style into a machine-usable receiver profile — deterministic rendering directives for any AI agent. Part of rpcs1.dev. Unrelated to RPCS3, the PlayStation 3 emulator.',
  alternates: { canonical: 'https://rpcs1.dev/bridge' },
  openGraph: {
    title: 'RPCS-1 Translation Bridge — AI that adapts to your cognitive style',
    description:
      'Compile your communication style into deterministic rendering directives for any AI agent.',
    url: 'https://rpcs1.dev/bridge',
    type: 'website',
  },
};

const C = {
  bg: 'bg-[#0b0e14]',
  panel: 'bg-[#131826]',
  line: 'border-[#232a3a]',
  text: 'text-[#e8ecf4]',
  muted: 'text-[#9aa4b8]',
  dim: 'text-[#6b7489]',
  accent: 'text-[#4f8cff]',
  green: 'text-[#7dd3a8]',
  warn: 'text-[#e8b45a]',
};

const rows = [
  {
    left: {
      t: 'Static instructions',
      d: 'Long system prompts get skimmed, diluted, or overridden as context grows.',
    },
    right: {
      t: 'Structured receiver profiles',
      d: 'Preferences compile into explicit, versioned rendering directives that survive context growth.',
    },
  },
  {
    left: {
      t: 'Implicit adaptation',
      d: 'You rely on the model to infer your communication parameters from conversation statistics. Our design premise — stated as a testable prediction, not a finding — is that this inference is unreliable and should be externalized.',
    },
    right: {
      t: 'External parameter-setting',
      d: 'Structure, warmth, explicitness, revision posture, and ambiguity handling are set as explicit knobs, outside the model’s discretion.',
    },
  },
  {
    left: {
      t: 'Cognitive friction',
      d: 'Exploratory probes get read as factual claims; executive-function load gets read as disinterest.',
    },
    right: {
      t: 'Precision translation',
      d: 'Claims are tagged separately from probes; evidence is separated from speculation; intent survives the channel.',
    },
  },
];

const features = [
  {
    t: 'Masking-mirror intake',
    badge: 'In SDK',
    good: true,
    d: 'A short behavioral calibration captures self-reported communication preferences, then reconciles them against observed divergence over time — surfacing where your stated style and your worked style differ.',
  },
  {
    t: 'ReceiverProfile JSON',
    badge: 'In SDK',
    good: true,
    d: 'Clean, versioned JSON containing explicit rendering directives, portable to any AI agent or LLM workflow. No prose. No vibes. Full schema at /v1/receiver-profile.json.',
  },
  {
    t: 'Governed profile updates',
    badge: 'In SDK',
    good: true,
    d: 'An externalized update rule refines the profile from ongoing interaction — with the learning rate itself a controlled parameter (your own UE), not model whim.',
  },
  {
    t: 'Privacy-tiered data control',
    badge: 'Roadmap',
    good: false,
    d: 'Tiered partitioning — Core Card, Working Profile, Private Archive — so profiles stay safe across public and enterprise endpoints. Designed; not yet shipped.',
  },
];

const ledger = [
  {
    tag: 'Derived',
    cls: 'bg-[#7dd3a81f] text-[#7dd3a8]',
    d: 'The receiver model is built on formal observer requirements: control knobs any bounded estimator-actor must set, with optimal-setting laws from standard optimality theory (IMM Paper 18).',
  },
  {
    tag: 'Registered',
    cls: 'bg-[#e8b45a1f] text-[#e8b45a]',
    d: 'A validation battery for the human-side profile (claim/probe dissociation, matching laws, urgency laws) is pre-registered with pass/fail criteria fixed before data generation. Results — pass or fail — will be published here.',
  },
  {
    tag: 'Open',
    cls: 'bg-[#9aa4b81f] text-[#9aa4b8]',
    d: 'Whether in-context AI receivers can self-tune these parameters from conversation statistics alone is an open, testable question. The bridge externalizes the parameters so you don’t have to bet on the answer.',
  },
];

export default function BridgePage() {
  return (
    <main className={`${C.bg} ${C.text} min-h-screen antialiased`}>
      <div className="mx-auto max-w-5xl px-[6%]">
        {/* Hero */}
        <header className={`border-b ${C.line} py-20`}>
          <p className={`font-mono text-xs uppercase tracking-[0.14em] ${C.accent} mb-5`}>
            Translation Bridge · receiver-side communication
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            AI that adapts to your cognitive style — not the other way around.
          </h1>
          <p className={`${C.muted} mt-6 max-w-2xl text-lg`}>
            The RPCS-1 Translation Bridge compiles a human communication profile into
            machine-usable rendering directives. It removes prompt friction and
            executive-function bottlenecks from AI collaboration — deterministically, not by
            hoping the model infers you.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href="/calibrate"
              className="rounded-lg bg-[#4f8cff] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Calibrate your profile
            </Link>
            <Link
              href="/translator"
              className={`rounded-lg border ${C.line} px-6 py-3 text-sm font-semibold hover:border-[#4f8cff]`}
            >
              Try the translator
            </Link>
            <code className={`rounded-lg border ${C.line} ${C.panel} px-5 py-3 font-mono text-sm ${C.green}`}>
              <span className={C.dim}>$ </span>npm install @rpcs1/core
            </code>
          </div>
        </header>

        {/* Status strip */}
        <div className={`grid grid-cols-1 border-b ${C.line} sm:grid-cols-3`}>
          {[
            ['Derived', C.green, 'Receiver control laws from standard estimator-actor optimality theory.'],
            ['Registered', C.warn, 'Validation battery pre-registered with fixed pass/fail criteria. Data not yet generated.'],
            ['Open', C.muted, 'Cross-substrate generalization of the receiver chart. We say so on the label.'],
          ].map(([k, cls, d]) => (
            <div key={k as string} className={`border-r ${C.line} p-6 last:border-r-0`}>
              <p className={`font-mono text-[11px] uppercase tracking-[0.12em] ${cls} mb-2`}>{k}</p>
              <p className={`text-sm ${C.muted}`}>{d}</p>
            </div>
          ))}
        </div>

        {/* Problem */}
        <section className={`border-b ${C.line} py-20`}>
          <h2 className="text-2xl font-bold">The problem with prompting a mind-reader</h2>
          <p className={`${C.muted} mt-3 mb-10 max-w-xl`}>
            System prompts describe you in prose and hope. The bridge replaces the hope with
            parameters.
          </p>
          <div className={`overflow-hidden rounded-xl border ${C.line}`}>
            <div className={`grid grid-cols-1 md:grid-cols-2 border-b ${C.line}`}>
              <p className={`p-4 font-mono text-xs uppercase tracking-widest ${C.muted}`}>Standard prompting</p>
              <p className={`p-4 font-mono text-xs uppercase tracking-widest ${C.accent}`}>The RPCS-1 bridge</p>
            </div>
            {rows.map((r) => (
              <div key={r.left.t} className={`grid grid-cols-1 border-b ${C.line} last:border-b-0 md:grid-cols-2`}>
                <div className="p-5">
                  <p className="font-semibold">{r.left.t}</p>
                  <p className={`mt-1 text-sm ${C.muted}`}>{r.left.d}</p>
                </div>
                <div className="bg-[#10141d] p-5">
                  <p className="font-semibold">{r.right.t}</p>
                  <p className={`mt-1 text-sm ${C.muted}`}>{r.right.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className={`border-b ${C.line} py-20`}>
          <h2 className="text-2xl font-bold">Platform</h2>
          <p className={`${C.muted} mt-3 mb-10`}>Each feature is labeled with its actual status. That&apos;s the house style.</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.t} className={`rounded-xl border ${C.line} ${C.panel} p-6`}>
                <h3 className="flex flex-wrap items-center gap-2.5 font-semibold">
                  {f.t}
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      f.good ? 'border-[#7dd3a866] text-[#7dd3a8]' : 'border-[#e8b45a66] text-[#e8b45a]'
                    }`}
                  >
                    {f.badge}
                  </span>
                </h3>
                <p className={`mt-2.5 text-sm ${C.muted}`}>{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Schema */}
        <section className={`border-b ${C.line} py-20`}>
          <h2 className="text-2xl font-bold">The schema, not the sales pitch</h2>
          <p className={`${C.muted} mt-3 mb-8 max-w-xl`}>
            Five primitives, continuous [0,100] — never category labels. Directives derive
            deterministically; the profile is the source of truth.
          </p>
          <pre className={`overflow-x-auto rounded-xl border ${C.line} bg-[#0d1117] p-6 font-mono text-[13px] leading-relaxed text-[#a5d6ff]`}>
{`{
  "$schema": "https://rpcs1.dev/v1/receiver-profile.json",
  "version": "1.0",
  "profile": { "TI": 20, "SG": 25, "FT": 80, "UE": 75, "AR": 75 },
  "directives": {
    "structure": "bluf",
    "warmth": "minimal",
    "explicitness": "explicit_literal",
    "revision": "open_challenge",
    "ambiguity": "commit"
  },
  "meta": { "source": "intake", "generator": "@rpcs1/core" }
}`}
          </pre>
          <p className={`mt-3 font-mono text-xs ${C.dim}`}>
            {'// matches ReceiverProfile + deriveRenderingDirectives in @rpcs1/core · full JSON Schema: '}
            <a href="/v1/receiver-profile.json" className={C.accent}>
              /v1/receiver-profile.json
            </a>
          </p>
        </section>

        {/* Grounding */}
        <section className={`border-b ${C.line} py-20`}>
          <h2 className="text-2xl font-bold">Grounding — at exactly its earned grade</h2>
          <p className={`${C.muted} mt-3 mb-8 max-w-xl`}>
            Most AI products claim more evidence than they have. This one is built on a public
            claim ledger, and this page obeys it.
          </p>
          <div className={`rounded-lg border ${C.line} border-l-2 border-l-[#4f8cff] ${C.panel} p-7`}>
            <ul>
              {ledger.map((l) => (
                <li key={l.tag} className={`flex gap-3.5 border-t ${C.line} py-3 first:border-t-0`}>
                  <span className={`mt-0.5 h-fit whitespace-nowrap rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${l.cls}`}>
                    {l.tag}
                  </span>
                  <span className={`text-sm ${C.muted}`}>{l.d}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-5 font-mono text-sm ${C.accent}`}>{'// no claim exceeds its derivation'}</p>
          </div>
        </section>

        <footer className={`flex flex-wrap justify-between gap-4 py-12 text-xs ${C.dim}`}>
          <p>
            RPCS-1 Translation Bridge · part of{' '}
            <Link href="/" className={C.accent}>
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
              className={C.accent}
            >
              travisbergen2/rpcs1-sdk
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
