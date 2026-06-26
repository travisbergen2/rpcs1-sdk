import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Find why an agent fails under pressure',
  description:
    'Practical RPCS1 examples for support copilots, coding agents, and research agents.',
};

const EXAMPLES = [
  {
    title: 'Customer support copilot tuning assessment',
    problem:
      'A deployed support copilot works in demos but gives inconsistent guidance when refunds, billing disputes, policy ambiguity, and live queue pressure collide.',
    prompt:
      'Tune a customer support copilot that assists human agents with refunds, billing disputes, escalation decisions, and policy exceptions. The environment is dynamic, somewhat predictable, high stakes, medium-context, and should be cautious before committing.',
    preset: 'support',
    fields: [
      'Target platform: anthropic',
      'Entropy: dynamic',
      'Predictability: somewhat_predictable',
      'Stakes: high',
      'Context relevance: medium',
      'Commitment style: cautious',
    ],
  },
  {
    title: 'Coding agent in a changing repository',
    problem:
      'A coding agent repeatedly changes direction, retries too aggressively, or commits before it has enough repository context.',
    prompt:
      'Tune a coding agent that inspects a changing repository, edits files, runs tests, and opens pull requests. Mistakes have medium stakes and relevant context is long-lived.',
    preset: 'coding',
    fields: [
      'Target platform: openai',
      'Entropy: moderate',
      'Predictability: somewhat_predictable',
      'Stakes: medium',
      'Context relevance: long',
      'Commitment style: balanced',
    ],
  },
  {
    title: 'High-stakes customer support agent',
    problem:
      'A support agent gives inconsistent answers or acts too quickly on refunds, disputes, and policy exceptions.',
    prompt:
      'Tune a customer support agent handling refunds, billing disputes, and policy exceptions in a dynamic environment with high stakes.',
    preset: 'support',
    fields: [
      'Target platform: anthropic',
      'Entropy: dynamic',
      'Predictability: somewhat_predictable',
      'Stakes: high',
      'Context relevance: medium',
      'Commitment style: cautious',
    ],
  },
  {
    title: 'Research agent with conflicting evidence',
    problem:
      'A research agent overreacts to new sources, loses earlier evidence, or presents uncertain conclusions too confidently.',
    prompt:
      'Tune a research agent that synthesizes conflicting technical sources into a cautious recommendation while retaining long-context evidence.',
    preset: 'research',
    fields: [
      'Target platform: generic',
      'Entropy: stable',
      'Predictability: highly_predictable',
      'Stakes: medium',
      'Context relevance: long',
      'Commitment style: cautious',
    ],
  },
];

export default function ExamplesPage() {
  return (
    <div>
      <h1>Find why an agent fails under pressure</h1>
      <p>
        RPCS1 is most useful when an agent&apos;s failures look behavioral rather than purely
        factual. These examples show when to call{' '}
        <code>recommend_agent_configuration</code>.
      </p>

      <section>
        <h2>Support copilot</h2>
        <p>A support copilot under live pressure with refunds and billing disputes.</p>
        <pre><code>{`Use recommend_agent_configuration to diagnose my support copilot.

Task: refund and billing dispute triage
Environment: dynamic, somewhat_predictable, high stakes
Context relevance: medium
Commitment style: cautious
Target platform: anthropic`}</code></pre>
        <p>
          The output should lead with the failure-risk score, predicted regime, runtime posture,
          and next test to run.
        </p>
      </section>

      <section>
        <h2>Coding agent</h2>
        <p>A coding agent that keeps changing direction or moving too early.</p>
        <pre><code>{`Use recommend_agent_configuration to diagnose my coding agent.

Task: inspect a changing repository, edit files, run tests, and open a pull request
Environment: moderate, somewhat_predictable, medium stakes
Context relevance: long
Commitment style: balanced
Target platform: openai`}</code></pre>
        <p>
          The output should lead with the same four things: failure-risk score, predicted regime,
          runtime posture, and next test to run.
        </p>
      </section>

      <section>
        <h2>Research agent</h2>
        <p>A research agent that overreacts to new sources or loses earlier evidence.</p>
        <pre><code>{`Tune a research agent that synthesizes conflicting technical sources into a cautious recommendation while retaining long-context evidence.`}</code></pre>
      </section>

      {EXAMPLES.map((example) => (
        <section key={example.preset}>
          <h2>{example.title}</h2>
          <p><strong>Problem:</strong> {example.problem}</p>
          <p><strong>Example request:</strong></p>
          <blockquote>{example.prompt}</blockquote>
          <p><strong>Assessment inputs:</strong></p>
          <ul>
            {example.fields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
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
