import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Translation Layer',
  description: 'RPCS-1 translation-layer rules for preserving face, reducing clarification churn, and aligning literal prompts to intended meaning.',
};

const RULES = [
  {
    name: 'Assume and state',
    body: 'Offer the most likely interpretation first, and say it as an assumption instead of a correction.',
  },
  {
    name: 'Preserve face',
    body: 'Avoid “actually,” “wrong,” and “you mean.” Use bridging language when the user is likely protecting status or identity.',
  },
  {
    name: 'Ask once, then proceed',
    body: 'If uncertainty matters, ask a single focused question. Otherwise continue with the best hypothesis and label it.',
  },
  {
    name: 'Translate between dictionaries',
    body: 'Map social, Jungian, technical, and literal language into the underlying structure before responding.',
  },
  {
    name: 'Separate content from emotion',
    body: 'Respond to both the request and the social layer. Acknowledge the frame without amplifying the threat response.',
  },
  {
    name: 'Offer dual output',
    body: 'When the prompt is ambiguous, give a plain-language answer and a technical version rather than forcing the user to choose first.',
  },
];

const MODES = [
  ['direct', 'Use when the user wants a blunt answer and the relationship cost is low.'],
  ['bridging', 'Use when the user likely meant something else but may not want a correction.'],
  ['face-preserving', 'Use when the prompt is emotionally loaded or status-sensitive.'],
  ['minimal-clarifying', 'Use when one missing detail blocks a safe answer.'],
];

export default function TranslationLayerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <p className="text-xs font-mono text-sky-400 mb-3">operational rule set</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-5">
          Translation Layer for Ambiguous Prompts
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          RPCS-1 can reduce prompt friction by translating between what a person said, what they
          likely meant, and what response will preserve trust while staying technically correct.
        </p>
      </div>

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">Why this matters</h2>
        <p className="text-gray-400 leading-relaxed">
          Many users interpret unexpected language as threat, not information. If the model
          responds by correcting the wrong layer, the conversation can get stuck in defensiveness.
          This layer is designed to preserve meaning, reduce token waste, and avoid condescension.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Rule set</h2>
        <div className="grid gap-3">
          {RULES.map((rule) => (
            <div key={rule.name} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <h3 className="text-sm font-semibold text-white mb-1">{rule.name}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5 mb-8">
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">Translation posture</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            Pick the posture before answering. The wrong posture is often what makes the reply
            sound rude, defensive, or off-target.
          </p>
          <div className="space-y-3">
            {MODES.map(([mode, description]) => (
              <div key={mode} className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
                <p className="text-xs font-mono text-sky-300 mb-1">{mode}</p>
                <p className="text-sm text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">Example behavior</h2>
          <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <p className="text-xs text-gray-500 mb-1">Instead of</p>
              <p className="text-gray-300">“That is not what you mean.”</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <p className="text-xs text-gray-500 mb-1">Say</p>
              <p className="text-gray-300">“I think you may mean X. If so, here is the technical version.”</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <p className="text-xs text-gray-500 mb-1">Fallback</p>
              <p className="text-gray-300">If the assumption is risky, ask one narrow question and continue.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Where to use it</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          This is most useful when the user is technical, emotionally loaded, status-sensitive, or
          trying to describe something abstract with the wrong vocabulary.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/tuner?preset=research"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
          >
            Tune a careful response
          </Link>
          <Link
            href="/pricing#diagnostic"
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Buy the diagnostic
          </Link>
        </div>
      </section>
    </div>
  );
}
