# RPCS1 Distribution Playbook

## Positioning

RPCS1 measures TI, SG, FT, UE, and AR in a configured agent, then returns
concrete runtime settings, a failure-risk score, and the next test to run.

Lead with the developer problem:

> You deployed AI. Is it actually matched to the environment it runs in?
> Describe the task, stakes, ambiguity, and context horizon, then get an
> explainable configuration for Anthropic, OpenAI, open-source, or generic
> runtimes.

The plain-language frame is: fit, not fault. When an AI agent fails after
deployment, diagnose the relationship between the agent, task, and operating
conditions before blaming the model or adding another tool.

## Directory listing copy

**Name:** RPCS1

**Endpoint:** `https://rpcs1.dev/mcp`

**Category:** AI and Machine Learning, Developer Tools, Agent Orchestration

**Short description:**

> Find why an agent fails under pressure and get the runtime settings to fix it.

**Long description:**

> RPCS1 is a public, read-only MCP server for deployed AI agents that need a
> five-primitive profile, failure-risk score, concrete runtime settings, and a
> next test to run. It supports Anthropic, OpenAI, open-source, and generic
> targets. No API key is required.

**Tool:** `recommend_agent_configuration`

**Safety statement:**

> Deterministic, read-only, idempotent, and does not modify external systems.

## Submission order

1. Official MCP Registry
   - Run the `Publish MCP Registry Metadata` GitHub Action after every
     `server.json` version change.
   - Verify:
     `https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.travisbergen2/rpcs1-agent-tuner`
   - Treat the server as publicly listed only after that registry search
     returns the RPCS1 listing.
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
       `["npm ci --include=optional","npm run build --workspace=@rpcs1/core","npm run build --workspace=@rpcs1/mcp-server"]`
     - CMD arguments:
       `["mcp-proxy","--","node","packages/mcp-server/dist/index.js"]`
     - Environment variables JSON schema:
       `{"properties":{},"required":[],"type":"object"}`
     - Placeholder parameters:
       `{}`
4. MCP.so and other aggregators
   - Submit the GitHub repository and remote endpoint.
   - Reuse the directory listing copy above.

## Integration content

Publish one narrowly scoped example at a time:

1. Customer support copilot tuning assessment.
2. Tune a coding agent that keeps changing direction.
3. Configure a high-stakes support agent without over-committing.
4. Diagnose why a research agent overreacts to conflicting evidence.
5. Avoid conflicting Anthropic sampling controls.

Each article should contain the recognizable failure, exact input, recommendation
output, before/after configuration, and links to the tuner, examples, and MCP
endpoint.

### First call example

Use this as the first obvious MCP call in the listing or example docs:

```text
Use recommend_agent_configuration to diagnose my support copilot.

Task: refund and billing dispute triage
Environment: dynamic, somewhat_predictable, high stakes
Context relevance: medium
Commitment style: cautious
Target platform: anthropic
```

The expected value is a plain diagnosis first:

- failure-risk score
- predicted regime
- runtime posture
- next test to run

Then the implementation details.

Use this as the second obvious MCP call:

```text
Use recommend_agent_configuration to diagnose my coding agent.

Task: inspect a changing repository, edit files, run tests, and open a pull request
Environment: moderate, somewhat_predictable, medium stakes
Context relevance: long
Commitment style: balanced
Target platform: openai
```

The expected value is the same shape:

- failure-risk score
- predicted regime
- runtime posture
- next test to run

### Glama top-of-list copy

Use this exact three-line structure at the top of the listing:

> Find why an agent fails under pressure.
>
> Measure TI, SG, FT, UE, and AR, then get a failure-risk score, runtime posture, and next test.
>
> Start with one support copilot or coding agent.

## Launch posts

### Hacker News

**Title:** Show HN: RPCS1 - diagnose whether deployed AI agents are tuned for their environment

> I built RPCS1 because many teams have already deployed AI agents and copilots,
> but still lack a simple diagnostic for whether those agents are matched to
> the environment they operate in. You describe entropy, predictability, stakes,
> context horizon, and commitment style; it returns TI, SG, FT, UE, AR plus
> warnings for oscillation, overload, freeze, and underdetermination.
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

> I made a free MCP tool for diagnosing whether a deployed AI agent is matched
> to its operating environment. It is aimed at failures like inconsistent support
> copilot guidance, oscillating between plans, retry overload, premature
> commitment, and agents becoming too cautious to act.
>
> Endpoint: https://rpcs1.dev/mcp
>
> Try three examples: https://rpcs1.dev/docs/examples
>
> It is deterministic, read-only, and needs no API key. I am looking for concrete
> cases where its recommendation is wrong or incomplete.

### LinkedIn or X

> Deployed AI is not the same thing as optimized AI.
>
> RPCS1 diagnoses whether an agent is matched to its environment, then maps
> entropy, predictability, stakes, context horizon, and commitment style to
> concrete runtime recommendations and stability warnings.
>
> Public MCP endpoint: https://rpcs1.dev/mcp
> Examples: https://rpcs1.dev/docs/examples
> Source: https://github.com/travisbergen2/rpcs1-sdk

## Weekly operating loop

Track MCP initialization, `tools/list`, successful tool calls, tuner views,
tuner submissions, recommendation generations, tuner failures, API recommendation
logs, GitHub stars, SDK installs, directory referrals, and example CTA clicks.
Use Vercel Analytics for page views, custom tuner events, and referrals; use
Vercel logs for API and MCP server events. Treat bounce rate as a weak secondary
signal, not the operating metric.

Every week, publish one example and make one directory or community submission.
Do not judge traction from general website bounce rate alone.
