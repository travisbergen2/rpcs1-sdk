import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'RPCS-1 docs — five-primitive battery, validity gates, tuner, and MCP integration.',
};

export default function DocsPage() {
  return (
    <div>
      <h1>RPCS-1 Documentation</h1>
      <p>
        RPCS-1 measures a configured agent with five primitives — TI, SG, FT, UE, and AR — then tells you
        what runtime settings to change. If you want a fast start, use the{' '}
        <Link href="/tuner">interactive tuner</Link> or connect the public MCP server.
      </p>

      <h2>Start here</h2>
      <p>
        Every recommendation flows through the same three steps:
      </p>
      <ol>
        <li>
          <strong>Describe the workload</strong> - task, entropy, predictability, stakes, context horizon, and commitment style.
        </li>
        <li>
          <strong>Receive the diagnosis</strong> - the output leads with the five-primitive profile, failure-risk score, posture, and next test.
        </li>
        <li>
          <strong>Ship the change</strong> - apply the runtime settings, then rerun one harder edge case.
        </li>
      </ol>
      <p>
        All outputs are deterministic and research-grade until the assay battery has been validated on fresh,
        procedurally generated items.
      </p>

      <h2>Quick links</h2>
      <ul>
        <li><Link href="/tuner">Free tuner</Link> - run a sample workflow in under a minute</li>
        <li><Link href="/pricing#diagnostic">Paid diagnostic</Link> - the written memo and sample preview</li>
        <li><Link href="/docs/getting-started">Getting started</Link> - install the Python SDK</li>
        <li><Link href="/docs/mcp">MCP integration</Link> - connect the public read-only server</li>
        <li><Link href="/docs/examples">Examples</Link> - support, coding, and research calls</li>
        <li><Link href="/docs/translation-layer">Translation layer</Link> - face-preserving posture</li>
        <li><Link href="/docs/primitives">Five primitives</Link> - TI, SG, FT, UE, AR</li>
        <li><Link href="/docs/regimes">Four regimes</Link> - stable, near oscillation, near overload, near freeze</li>
      </ul>

      <h2>AI agent integrations</h2>
      <p>
        RPCS-1 is available as a public, anonymous, read-only MCP server. It requires no API key or OAuth
        authentication. See the <Link href="/docs/mcp">MCP integration guide</Link> for the endpoint,
        first call, and tool details.
      </p>
      <ul>
        <li><Link href="/openapi.json">OpenAPI schema</Link> - REST tool contract</li>
        <li><Link href="/llms.txt">llms.txt</Link> - machine-readable product overview</li>
      </ul>

      <h2>Try it now</h2>
      <p>
        The <Link href="/tuner">interactive tuner</Link> requires no installation and no account.
        Start from support, coding, or research and get recommendations in under a minute.
      </p>
    </div>
  );
}
