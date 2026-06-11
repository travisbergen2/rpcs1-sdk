import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Integration',
  description:
    'Connect MCP-compatible clients to the public RPCS-1 Agent Tuner server.',
};

export default function McpIntegrationPage() {
  return (
    <div>
      <h1>MCP Integration</h1>
      <p>
        RPCS-1 provides a public Streamable HTTP MCP server for agent configuration
        recommendations. The server is anonymous, deterministic, read-only, and idempotent.
        It does not require an API key, account, or OAuth authentication.
      </p>

      <h2>Connection details</h2>
      <ul>
        <li><strong>Name:</strong> RPCS1 Agent Tuner</li>
        <li><strong>URL:</strong> <code>https://rpcs1.dev/mcp</code></li>
        <li><strong>Transport:</strong> Streamable HTTP</li>
        <li><strong>Authentication:</strong> None</li>
      </ul>

      <h2>Hyperagent compatibility</h2>
      <p>
        RPCS-1 provides a fixed public OAuth client for Hyperagent using authorization code flow
        with PKCE. In Hyperagent, enable <strong>Bring my own OAuth app</strong> and enter:
      </p>
      <ul>
        <li><strong>Redirect URI:</strong> <code>https://hyperagent.com/api/mcp-servers/callback</code></li>
        <li><strong>Client ID:</strong> <code>hyperagent-rpcs1</code></li>
        <li><strong>Client secret:</strong> leave blank</li>
        <li><strong>Authorization endpoint:</strong> <code>https://rpcs1.dev/oauth/authorize</code></li>
        <li><strong>Token endpoint:</strong> <code>https://rpcs1.dev/oauth/token</code></li>
        <li><strong>Scopes:</strong> <code>mcp:tools</code></li>
      </ul>
      <p>
        RPCS-1 also publishes OAuth discovery metadata, so the endpoint fields may be left blank
        when Hyperagent successfully discovers them automatically.
      </p>

      <h2>Available tool</h2>
      <p>
        The server exposes one focused tool: <code>recommend_agent_configuration</code>.
        Use it when designing, tuning, or diagnosing an AI agent against environmental entropy,
        predictability, stakes, context horizon, and commitment style.
      </p>

      <h2>Safety and privacy</h2>
      <p>
        The MCP tool returns recommendations without modifying external systems. Only send task
        and environment information you are comfortable submitting to the RPCS-1 service.
        Recommendations support engineering decisions but do not replace domain-specific safety,
        legal, medical, or financial review.
      </p>
    </div>
  );
}
