# RPCS1 Distribution Playbook

## Positioning

RPCS1 is a deterministic agent-configuration tool. It turns an agent's operating
environment into concrete model and runtime settings, then warns when the
configuration is near oscillation, overload, or freeze.

Lead with the developer problem:

> Stop guessing agent parameters. Describe the environment and get an
> explainable configuration for Anthropic, OpenAI, open-source, or generic
> runtimes.

## Directory listing copy

**Name:** RPCS1 Agent Tuner

**Endpoint:** `https://rpcs1.dev/mcp`

**Category:** AI and Machine Learning, Developer Tools, Agent Orchestration

**Short description:**

> Configure AI agents and diagnose oscillation, overload, freeze, and
> environment mismatch.

**Long description:**

> RPCS1 is a public, read-only MCP server that recommends concrete LLM and
> agent-runtime settings from environmental entropy, predictability, stakes,
> context horizon, and commitment style. It supports Anthropic, OpenAI,
> open-source, and generic targets and returns an explainable receiver profile,
> predicted stability regime, warnings, and parameter recommendations. No API
> key is required.

**Tool:** `recommend_agent_configuration`

**Safety statement:**

> Deterministic, read-only, idempotent, and does not modify external systems.

## Submission order

1. Official MCP Registry
   - The server is already listed.
   - Run the `Publish MCP Registry Metadata` GitHub Action after every
     `server.json` version change.
   - Verify:
     `https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.travisbergen2/rpcs1-agent-tuner`
2. Smithery
   - Submit `https://rpcs1.dev/mcp` at `https://smithery.ai/new`.
   - Claim the listing and complete vendor verification.
   - The static scan card is available at
     `https://rpcs1.dev/.well-known/mcp/server-card.json`.
3. Glama
   - Use the Add Server flow at `https://glama.ai/mcp/servers`.
   - Claim the listing after import.
   - For automated checks, configure Glama to build the standalone STDIO
     package:
     - Build steps:
       `["npm install","npm run build --workspace=@rpcs1/mcp-server"]`
     - CMD arguments:
       `["node","packages/mcp-server/dist/index.js"]`
     - Environment variables JSON schema:
       `{"properties":{},"required":[],"type":"object"}`
     - Placeholder parameters:
       `{}`
4. MCP.so and other aggregators
   - Submit the GitHub repository and remote endpoint.
   - Reuse the directory listing copy above.

## Integration content

Publish one narrowly scoped example at a time:

1. Tune a coding agent that keeps changing direction.
2. Configure a high-stakes support agent without over-committing.
3. Diagnose why a research agent overreacts to conflicting evidence.
4. Avoid conflicting Anthropic sampling controls.

Each article should contain the recognizable failure, exact input, recommendation
output, before/after configuration, and links to the tuner, examples, and MCP
endpoint.

## Launch posts

### Hacker News

**Title:** Show HN: RPCS1 - a deterministic MCP server for tuning AI agents

> I built RPCS1 because agent configuration still involves a lot of guessing.
> You describe the task environment - entropy, predictability, stakes, context
> horizon, and commitment style - and it returns model/runtime settings plus a
> warning if the agent is near oscillation, overload, or freeze.
>
> It is public, read-only, deterministic, and available as a Streamable HTTP MCP
> server with no API key:
>
> https://rpcs1.dev/mcp
>
> Interactive examples: https://rpcs1.dev/docs/examples
>
> Source: https://github.com/travisbergen2/rpcs1-sdk
>
> I would especially value feedback on the input model and whether the returned
> reasoning is useful during real agent debugging.

### Developer community

> I made a free MCP tool that recommends agent parameters from the environment
> the agent operates in. It is aimed at failures like oscillating between plans,
> retry overload, premature commitment, and agents becoming too cautious to act.
>
> Endpoint: https://rpcs1.dev/mcp
>
> Try three examples: https://rpcs1.dev/docs/examples
>
> It is deterministic, read-only, and needs no API key. I am looking for concrete
> cases where its recommendation is wrong or incomplete.

### LinkedIn or X

> Agent parameters should depend on the environment, not a universal preset.
>
> RPCS1 maps entropy, predictability, stakes, context horizon, and commitment
> style to concrete runtime recommendations and stability warnings.
>
> Public MCP endpoint: https://rpcs1.dev/mcp
> Examples: https://rpcs1.dev/docs/examples
> Source: https://github.com/travisbergen2/rpcs1-sdk

## Weekly operating loop

Track directory listing views, MCP initialization and tool calls, tuner
recommendations, GitHub stars, SDK installs, and referrals from each launch.

Every week, publish one example and make one directory or community submission.
Do not judge traction from general website bounce rate alone.
