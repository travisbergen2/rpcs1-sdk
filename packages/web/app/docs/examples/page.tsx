import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Agent Tuning Examples',
  description:
    'Practical RPCS1 examples for coding agents, customer support agents, and research agents.',
};

const EXAMPLES = [
  {
    title: 'Coding agent in a changing repository',
    problem:
      'A coding agent repeatedly changes direction, retries too aggressively, or commits before it has enough repository context.',
    prompt:
      'Tune a coding agent that inspects a changing repository, edits files, runs tests, and opens pull requests. Mistakes have medium stakes and relevant context is long-lived.',
    preset: 'coding',
  },
  {
    title: 'High-stakes customer support agent',
    problem:
      'A support agent gives inconsistent answers or acts too quickly on refunds, disputes, and policy exceptions.',
    prompt:
      'Tune a customer support agent handling refunds, billing disputes, and policy exceptions in a dynamic environment with high stakes.',
    preset: 'support',
  },
  {
    title: 'Research agent with conflicting evidence',
    problem:
      'A research agent overreacts to new sources, loses earlier evidence, or presents uncertain conclusions too confidently.',
    prompt:
      'Tune a research agent that synthesizes conflicting technical sources into a cautious recommendation while retaining long-context evidence.',
    preset: 'research',
  },
];

export default function ExamplesPage() {
  return (
    <div>
      <h1>Agent tuning examples</h1>
      <p>
        RPCS1 is most useful when an agent&apos;s failures look behavioral rather than purely
        factual: oscillation, overload, premature commitment, excessive retries, or frozen
        decision-making. These examples show when to call{' '}
        <code>recommend_agent_configuration</code>.
      </p>

      {EXAMPLES.map((example) => (
        <section key={example.preset}>
          <h2>{example.title}</h2>
          <p><strong>Problem:</strong> {example.problem}</p>
          <p><strong>Example request:</strong></p>
          <blockquote>{example.prompt}</blockquote>
          <p>
            <Link href={`/tuner?preset=${example.preset}`}>
              Run this example in the tuner
            </Link>
          </p>
        </section>
      ))}

      <h2>Use through MCP</h2>
      <p>
        Connect <code>https://rpcs1.dev/mcp</code> as a Streamable HTTP server, then ask your
        agent to tune or diagnose another agent. The server is public, read-only, deterministic,
        and requires no API key.
      </p>
      <pre><code>{`Use recommend_agent_configuration to tune my agent.

Task: triage production incidents and propose remediation
Environment: dynamic, somewhat predictable, high stakes
Context relevance: long
Commitment style: cautious
Target platform: anthropic`}</code></pre>
    </div>
  );
}
