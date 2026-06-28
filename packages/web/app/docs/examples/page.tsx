import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Examples',
  description: 'High-intent RPCS-1 calls for support copilots, coding agents, and research agents.',
};

const EXAMPLES = [
  {
    title: 'Support copilot under pressure',
    problem:
      'Use this when refunds, billing disputes, policy exceptions, and queue pressure make the agent behave inconsistently.',
    prompt: `Use recommend_agent_configuration to diagnose my support copilot.

Task: refund and billing dispute triage
Environment: dynamic, somewhat_predictable, high stakes
Context relevance: medium
Commitment style: cautious
Target platform: anthropic`,
  },
  {
    title: 'Coding agent in a changing repository',
    problem:
      'Use this when a coding agent retries too aggressively, changes direction, or commits before it has enough context.',
    prompt: `Use recommend_agent_configuration to diagnose my coding agent.

Task: inspect a changing repository, edit files, run tests, and open a pull request
Environment: moderate, somewhat_predictable, medium stakes
Context relevance: long
Commitment style: balanced
Target platform: openai`,
  },
  {
    title: 'Research agent with conflicting sources',
    problem:
      'Use this when a research agent overreacts to new sources, loses earlier evidence, or sounds too confident.',
    prompt: `Use recommend_agent_configuration to diagnose my research agent.

Task: synthesize conflicting technical sources into a cautious recommendation
Environment: stable, highly_predictable, medium stakes
Context relevance: long
Commitment style: cautious
Target platform: generic`,
  },
];

export default function ExamplesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
      <div className="max-w-3xl mb-12">
        <p className="text-xs font-mono text-sky-400 mb-3">examples</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          High-intent calls to try first.
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          These are the cases where RPCS-1 is most obvious: a support copilot under pressure, a coding agent in a changing repo, or a research agent handling conflicting evidence. The first useful answer should lead with TI, SG, FT, UE, AR, then the failure-risk score and next test.
        </p>
      </div>

      <div className="grid gap-6">
        {EXAMPLES.map((example) => (
          <section key={example.title} className="rounded-2xl border border-gray-800 bg-gray-950/80 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold text-white mb-2">{example.title}</h2>
                <p className="text-gray-400 leading-relaxed">{example.problem}</p>
              </div>
              <Link
                href="/tuner"
                className="inline-flex items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/15"
              >
                Run in the tuner
              </Link>
            </div>
            <div className="mt-5 rounded-xl border border-gray-800 bg-gray-900/70 p-4">
              <p className="text-xs font-mono text-sky-400 mb-2">example request</p>
              <pre className="overflow-x-auto whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                <code>{example.prompt}</code>
              </pre>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-sky-500/15 bg-sky-500/5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-3">What the output should lead with</h2>
        <ul className="grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
          <li>• TI, SG, FT, UE, AR</li>
          <li>• Failure-risk score</li>
          <li>• Predicted regime</li>
          <li>• Runtime posture</li>
          <li>• Best next test</li>
        </ul>
      </div>
    </div>
  );
}
