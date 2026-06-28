import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Integration',
  description:
    'Connect MCP-compatible clients to the public RPCS-1 five-primitive battery.',
};

export default function McpIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
      <div className="max-w-3xl mb-12">
        <p className="text-xs font-mono text-sky-400 mb-3">mcp</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Connect the public RPCS-1 battery.
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          RPCS-1 provides a public Streamable HTTP MCP server for measuring TI, SG, FT, UE, and AR in a configured
          agent. It is anonymous, deterministic, read-only, and does not require an API key.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-gray-800 bg-gray-950/80 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4">Connection details</h2>
          <div className="space-y-3 text-sm text-gray-400">
            <p><strong className="text-white">Name:</strong> RPCS1 Agent Tuner</p>
            <p><strong className="text-white">URL:</strong> <code>https://rpcs1.dev/mcp</code></p>
            <p><strong className="text-white">Transport:</strong> Streamable HTTP</p>
            <p><strong className="text-white">Authentication:</strong> None</p>
          </div>

          <h2 className="mt-8 text-xl font-semibold text-white mb-4">One tool</h2>
          <p className="text-gray-400 leading-relaxed">
            The server exposes one focused tool: <code>recommend_agent_configuration</code>.
            Use it when you want a five-primitive profile, a failure-risk score, runtime posture, and a next test
            for a support copilot, coding agent, research agent, or workflow assistant.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="/docs/examples"
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
            >
              See examples
            </a>
            <a
              href="/tuner"
              className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
            >
              Try the tuner
            </a>
          </div>
        </section>

        <aside className="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4">How to use it</h2>
          <ol className="space-y-4 text-sm text-gray-400 leading-relaxed">
            <li>1. Connect <code>https://rpcs1.dev/mcp</code> in your MCP client.</li>
            <li>2. Send one workflow plus its operating conditions.</li>
            <li>3. Read TI, SG, FT, UE, AR, then the failure-risk score and next check.</li>
          </ol>
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950/70 p-4">
            <p className="text-xs font-mono text-amber-400 mb-2">best for</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Teams that want to tune or diagnose agents without moving into a heavier integration or support process.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/80 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-3">First call to try</h2>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300 leading-relaxed">
{`Use recommend_agent_configuration to diagnose my support copilot.

Task: refund and billing dispute triage
Environment: dynamic, somewhat_predictable, high stakes
Context relevance: medium
Commitment style: cautious
Target platform: anthropic`}
        </pre>
        <p className="mt-4 text-sm text-gray-400 leading-relaxed">
          The useful first answer is the five-primitive profile, failure-risk score, runtime posture, and the next test
          to run.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/80 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-3">Hyperagent compatibility</h2>
        <p className="text-gray-400 leading-relaxed">
          RPCS-1 provides a fixed public OAuth client for Hyperagent using authorization code flow with PKCE.
          In Hyperagent, enable <strong>Bring my own OAuth app</strong> and enter the discovery values below.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
          <li><strong className="text-white">Redirect URI:</strong> <code>https://hyperagent.com/api/mcp-servers/callback</code></li>
          <li><strong className="text-white">Client ID:</strong> <code>hyperagent-rpcs1</code></li>
          <li><strong className="text-white">Client secret:</strong> leave blank</li>
          <li><strong className="text-white">Authorization endpoint:</strong> <code>https://rpcs1.dev/oauth/authorize</code></li>
          <li><strong className="text-white">Token endpoint:</strong> <code>https://rpcs1.dev/oauth/token</code></li>
          <li><strong className="text-white">Scopes:</strong> <code>mcp:tools</code></li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/80 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-3">Safety and privacy</h2>
        <p className="text-gray-400 leading-relaxed">
          The MCP tool returns recommendations without modifying external systems. Only send task and environment
          information you are comfortable submitting to the RPCS-1 service.
        </p>
      </section>
    </div>
  );
}
