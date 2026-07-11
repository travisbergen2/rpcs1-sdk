import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Integration',
  description:
    'Connect MCP-compatible clients to the public RPCS-1 server: agent tuning, translation, and the per-user Translation Bridge loop. Seven tools, no API key.',
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
          RPCS-1 provides a public Streamable HTTP MCP server with seven tools across three families:
          agent tuning, translation, and the per-user Translation Bridge loop. It is anonymous,
          deterministic, read-only, and does not require an API key.
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

          <h2 className="mt-8 text-xl font-semibold text-white mb-4">Seven tools, three families</h2>
          <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
            <div>
              <p className="text-xs font-mono text-sky-300 mb-1">Agent tuning</p>
              <p>
                <code>recommend_agent_configuration</code> — a five-primitive profile, failure-risk
                score, runtime posture, and next test for a described workload.
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-sky-300 mb-1">Translation</p>
              <p>
                <code>interpret</code> (ambiguity detection and intent recovery), <code>normalize</code>{' '}
                (fragmented text to coherent prose), <code>rewrite</code> (six fixed audience styles).
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-sky-300 mb-1">Translation Bridge — the per-user loop</p>
              <p>
                <code>calibrate_profile</code> builds a user&apos;s ReceiverProfile from five in-chat
                questions (continuous coordinates, never a category label).{' '}
                <code>prepare_prompt</code> recovers intent from the user&apos;s raw message on the way
                in. <code>render_reply</code> returns deterministic rendering instructions for the
                user&apos;s profile on the way out. The profile travels as a parameter — nothing is
                stored server-side. Schema:{' '}
                <a href="/v1/receiver-profile.json" className="text-sky-400 hover:underline">
                  /v1/receiver-profile.json
                </a>
              </p>
            </div>
          </div>

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
            <li>2. Tuning: send one workflow plus its operating conditions; read the profile, risk score, and next check.</li>
            <li>3. Bridge: run <code>calibrate_profile</code> once, save the JSON it returns, and ask the model to use <code>render_reply</code> with your profile on every answer.</li>
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
        <h2 className="text-xl font-semibold text-white mb-3">The bridge loop, end to end</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          One calibration, then every reply adapts to you — no copy/paste. Paste this into any
          MCP client connected to the server:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300 leading-relaxed">
{`Step 1 — once:
"Use calibrate_profile to build my receiver profile.
 Ask me the five questions, then save the profile JSON
 to your memory for this project."

Step 2 — every turn (add to project/system instructions):
"Before answering me, call render_reply with your draft
 and my saved profile, and apply its instructions.
 If my request is ambiguous, call prepare_prompt with my
 message and profile before acting."`}
        </pre>
        <p className="mt-4 text-sm text-gray-400 leading-relaxed">
          Example: a profile of <code>TI 20 · SG 25 · FT 80 · UE 75 · AR 75</code> makes every reply
          lead with the answer, stay flat and literal, welcome pushback, and commit to the most
          likely reading instead of interrogating you. The instructions are deterministic — same
          profile, same directives, every time.
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
