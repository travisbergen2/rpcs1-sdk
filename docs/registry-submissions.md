# Registry Submissions — click-by-click

Everything below is paste-ready. Four listings, in priority order. The MCP endpoint
is `https://rpcs1.dev/mcp` (Streamable HTTP, no auth, read-only, rate-limited).

---

## Shared copy block (paste anywhere a form asks)

**Name:** RPCS-1 Agent Tuner & Translation Bridge
**One-liner:** Agent settings derived from receiver laws, and replies rendered for *your* communication profile — deterministic, stateless, no auth.
**Short description (~250 chars):**
RPCS-1 turns an agent's operating conditions into derived runtime settings (temperature, context strategy, failure-mode read), and its Translation Bridge calibrates a per-user receiver profile so every reply is rendered for that user's communication style. 7 tools, no API key.
**Long description:**
RPCS-1 exposes two capability families over one public MCP server. (1) Agent tuning: `recommend_agent_configuration` maps workload conditions — entropy, stakes, predictability, context horizon — to runtime settings and the nearest failure mode (oscillation, overload, freeze), using receiver laws derived from observer requirements (IMM Paper 18); the laws were checked against pre-registered numerical criteria and the public scorecard includes the checks that failed. (2) Translation Bridge: `calibrate_profile` builds a continuous five-primitive communication profile from five in-chat questions (never a category label); `prepare_prompt` recovers intent from ambiguous user input; `render_reply` returns deterministic rendering instructions so the model adapts every reply to the user — structure, warmth, explicitness, revision posture, ambiguity handling. Plus `interpret`, `normalize`, `rewrite` for general translation work. All tools are deterministic, stateless, and read-only; profiles travel as parameters and nothing is stored server-side.
**Categories/tags:** developer-tools, productivity, accessibility, communication, ai-agents
**Endpoint:** https://rpcs1.dev/mcp (Streamable HTTP)
**Auth:** none
**Repo:** https://github.com/travisbergen2/rpcs1-sdk (MIT)
**Docs:** https://rpcs1.dev/docs/mcp

---

## 1. Official MCP Registry (registry.modelcontextprotocol.io)

The `server.json` at the repo root is ready and validates against schema 2025-12-11.
Publishing is CLI-based:

```bash
# install the publisher CLI (macOS/Linux)
brew install mcp-publisher
# or: curl -fsSL https://raw.githubusercontent.com/modelcontextprotocol/registry/main/install.sh | bash

cd rpcs1-sdk   # repo root, where server.json lives

# Authenticate. The name "dev.rpcs1/agent-tuner" is domain-namespaced, so verify domain ownership:
mcp-publisher login dns    # prints the exact TXT record to add at your DNS host — add it, wait, re-run
# (alternative: mcp-publisher login http — serves a challenge file; DNS is easier on Vercel)

mcp-publisher publish
```

Notes:
- You're already adding a Google-verification TXT record this week; add this one in the same sitting.
- If you'd rather skip DNS entirely: change `"name"` in server.json to
  `"io.github.travisbergen2/rpcs1-agent-tuner"` and run `mcp-publisher login github` instead
  (OAuth device flow, zero DNS). The domain name is better branding; the GitHub name is faster.
- New versions: bump `version` in server.json and re-run `mcp-publisher publish`.

## 2. Smithery (smithery.ai)

Smithery lists remote servers by URL from the dashboard:
1. Sign in at smithery.ai with GitHub.
2. "Add Server" → choose external/hosted → paste `https://rpcs1.dev/mcp`.
3. Paste the shared copy block; tag `developer-tools`, `communication`.
4. Claim the server against the `travisbergen2/rpcs1-sdk` repo when prompted.

(If their flow asks for a `smithery.yaml`, their current dashboard generates it for
hosted-by-URL servers — follow the UI; don't hand-write one for a remote server.)

## 3. PulseMCP (pulsemcp.com)

1. pulsemcp.com → "Submit a Server" (footer / community form).
2. Fields: name, endpoint URL, GitHub repo, description → use the shared copy block.
3. They index the GitHub repo README too — the README mentions the MCP endpoint, which helps.

## 4. mcp.so

1. mcp.so → "Submit" (top-right).
2. It's a GitHub-repo-first directory: submit `https://github.com/travisbergen2/rpcs1-sdk`,
   set type to "remote/hosted", endpoint `https://rpcs1.dev/mcp`.
3. Paste the shared copy block.

---

## After listing (all four)

- Verify the listing renders the 7 tools (some directories probe `tools/list` live).
- Add the registry badges/links to `/docs/mcp` so the listings and docs cross-reference.
- When the server version bumps, update: official registry (`mcp-publisher publish`),
  Smithery (auto-detects on probe), PulseMCP/mcp.so (edit listing or it re-indexes).
