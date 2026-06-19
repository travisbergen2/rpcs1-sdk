import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI-Human Mismatch',
  description:
    'RPCS-1 as an AI-human collaboration framework: destructive many-to-one collapse, distinction preservation, matching analysis, and shared representation.',
};

const LAYERS = [
  {
    name: '1. Observation',
    summary: 'Capture the interaction before judging it.',
    items: ['Prompt', 'Response', 'Context', 'User corrections'],
  },
  {
    name: '2. Collapse Analysis',
    summary: 'Ask which distinctions were removed by compression.',
    items: [
      'What distinctions did the AI remove?',
      'What distinctions did the human expect preserved?',
      'Which missing distinction changed the meaning?',
    ],
  },
  {
    name: '3. Matching Analysis',
    summary: 'Estimate whether the compression preserved what mattered.',
    items: [
      'Relevant distinctions preserved',
      'Compression cost',
      'Mismatch severity',
    ],
  },
  {
    name: '4. Adaptation',
    summary: 'Adjust the receiver gates in operational order.',
    items: ['FT', 'TI', 'AR', 'SG', 'UE'],
  },
  {
    name: '5. Shared Representation',
    summary: 'Translate the mismatch into a form both sides can use.',
    items: [
      'The AI interpreted X.',
      'The human intended Y.',
      'The mismatch occurred because distinction Z was collapsed.',
    ],
  },
];

const EXAMPLES = [
  ['Human preserves emotional context', 'AI preserves logical structure'],
  ['Human says one thing and implies another', 'AI preserves literal meaning'],
  ['AI explains', 'Human hears criticism'],
  ['Human wants recognition first', 'AI jumps to optimization'],
];

export default function MismatchPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <p className="text-xs font-mono text-rose-300 mb-3">AI-human collaboration</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-5">
          Mismatch Is Destructive Many-To-One Collapse
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          Humans and AIs are both compressing reality. The collaboration problem is not
          always that either side is wrong. Often, each side preserves different distinctions.
          RPCS-1 treats that as a receiver/environment matching problem.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">The Shift</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <p className="text-xs text-gray-500 mb-2">Narrow product question</p>
            <p className="text-gray-300">&quot;What temperature should I use?&quot;</p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs text-rose-300 mb-2">Larger collaboration question</p>
            <p className="text-gray-100">&quot;Why are the human and AI misunderstanding each other?&quot;</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Core Frame</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          IMM says observers do not access reality directly. They compress many possible
          environmental states into receiver states. Human-AI mismatch occurs when that
          compression destroys a distinction one side needed preserved.
        </p>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`Mismatch = destructive many-to-one collapse

Collaboration improves when:
relevant distinctions preserved / compression cost increases`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Different Distinctions Preserved</h2>
        <div className="grid gap-3">
          {EXAMPLES.map(([human, ai]) => (
            <div key={human} className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="text-xs text-gray-500 mb-1">Human may preserve</p>
                <p className="text-gray-300">{human}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="text-xs text-gray-500 mb-1">AI may preserve</p>
                <p className="text-gray-300">{ai}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Working Matching Score</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          This is not a finished theorem. It is a practical score for inspecting a conversation:
          did the interaction preserve the distinctions needed for the next successful move?
        </p>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`M(f) = Relevant Distinctions Preserved / Compression Cost`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Architecture For Collaboration</h2>
        <div className="grid gap-3">
          {LAYERS.map((layer) => (
            <div key={layer.name} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
              <h3 className="font-semibold text-white mb-1">{layer.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{layer.summary}</p>
              <ul className="grid gap-1 text-sm text-gray-500 sm:grid-cols-2">
                {layer.items.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Adaptation Gate Order</h2>
        <p className="font-mono text-lg text-sky-100 mb-2">FT → TI → AR → SG → UE</p>
        <p className="text-sm text-gray-400">
          Filter noise first. Integrate over time. Resolve ambiguity. Amplify only the
          interpreted signal. Then update or act.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Where This Leads</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          The tuner remains useful, but it becomes one layer inside a larger interface theory:
          understand the match between minds, identify destructive collapse, and generate a
          shared representation both human and AI can act from.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/imm" className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-600 hover:text-white">
            Read the IMM primer
          </Link>
          <Link href="/tuner?preset=support" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
            Run a support example
          </Link>
        </div>
      </section>
    </div>
  );
}
