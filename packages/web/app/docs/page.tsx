import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'RPCS-1 AI quality diagnostics documentation — assessment workflow, MCP integration, receiver primitives, and platform mappings.',
};

export default function DocsPage() {
  return (
    <div>
      <h1>RPCS-1 AI Quality Diagnostics — Documentation</h1>
      <p>
        RPCS-1 gives AI teams a structured configuration assessment for deployed agents.
        Describe the workload and operating conditions to receive a deterministic failure-risk
        diagnosis, runtime posture, and implementation settings. The technical mechanism is
        documented below for teams that want the full receiver-dynamics model.
      </p>

      <h2>How it works</h2>
      <p>
        Every recommendation flows through three steps:
      </p>
      <ol>
        <li>
          <strong>Compute receiver primitives</strong> — your environment inputs are translated into
          five receiver primitives (TI, SG, FT, UE, AR) using the{' '}
          <Link href="/docs/matching">Matching Principle</Link> and basin stability geometry.
        </li>
        <li>
          <strong>Map to platform parameters</strong> — the primitives are mapped to your target
          platform&apos;s parameter space (temperature, max_tokens, model, tool strategy, etc.).
        </li>
        <li>
          <strong>Evaluate regime</strong> — the resulting profile is checked against the four
          stability boundaries (stable / near_oscillation / near_overload / near_freeze) and
          any warnings are surfaced.
        </li>
      </ol>
      <p>All steps are deterministic. The same inputs always produce the same outputs.</p>

      <h2>Quick links</h2>
      <ul>
        <li><Link href="/docs/getting-started">Getting started</Link> — install the Python SDK</li>
        <li><Link href="/docs/mcp">MCP integration</Link> — endpoint, authentication, and client compatibility</li>
        <li><Link href="/imm">IMM primer</Link> — AI-readable bridge from IMM to RPCS-1 to agent tuning</li>
        <li><Link href="/mismatch">AI-human mismatch</Link> — destructive many-to-one collapse and shared representation</li>
        <li><Link href="/docs/primitives">The five primitives</Link> — TI, SG, FT, UE, AR explained</li>
        <li><Link href="/docs/matching">Matching principle</Link> — Pred-09-5: TI ≈ 1/H</li>
        <li><Link href="/docs/regimes">Stability regimes</Link> — oscillation, overload, freeze</li>
        <li><Link href="/docs/platforms">Platform mappings</Link> — Anthropic, OpenAI, open source</li>
      </ul>

      <h2>AI agent integrations</h2>
      <p>
        RPCS-1 is available as a public, anonymous, read-only MCP server. It requires no API key
        or OAuth authentication. See the <Link href="/docs/mcp">MCP integration guide</Link> for
        the endpoint, client compatibility, and tool details.
      </p>
      <ul>
        <li><Link href="/openapi.json">OpenAPI schema</Link> — REST tool contract</li>
        <li><Link href="/llms.txt">llms.txt</Link> — concise machine-readable product overview</li>
      </ul>

      <h2>Just want to try it?</h2>
      <p>
        The <Link href="/tuner">interactive tuner</Link> requires no installation and no account.
        Describe your agent and get recommendations in under 30 seconds.
      </p>
    </div>
  );
}
