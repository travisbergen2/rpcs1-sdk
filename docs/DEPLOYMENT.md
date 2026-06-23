# Release and Deployment Guide

Current release line: `0.2.1`.

This guide assumes the production site is already hosted at `https://rpcs1.dev`
and the public MCP endpoint is `https://rpcs1.dev/mcp`.

## 1. Sync Version Metadata

Before publishing a release, keep these files on the same version:

- `package.json`
- `packages/core/package.json`
- `packages/web/package.json`
- `packages/mcp-server/package.json`
- `sdk/python/pyproject.toml`
- `sdk/python/src/rpcs1/__init__.py`
- `server.json`
- `packages/web/public/openapi.json`
- `packages/web/app/api/health/route.ts`
- `packages/web/lib/mcp-server.ts`
- `packages/mcp-server/src/index.ts`

After package metadata changes, refresh the npm lockfile:

```bash
npm install --package-lock-only --ignore-scripts
```

## 2. Validate the Release Locally

```bash
npm ci --include=optional
npm run build:all
npm run test --workspace=packages/core
npm run test --workspace=packages/web
```

Validate the Python SDK:

```bash
cd sdk/python
python -m pip install -e ".[dev]"
python -m pytest -q
python -m build
```

## 3. Deploy the Web and MCP Endpoint

Vercel deploys `packages/web`. Confirm these settings before promoting:

- Root directory: `packages/web`
- Framework: Next.js
- Node runtime: compatible with `>=20 <27`
- Production domains: `rpcs1.dev`, `www.rpcs1.dev`
- Required environment variables from the project settings are present.

After deployment, verify:

```bash
curl https://rpcs1.dev/api/health
curl https://rpcs1.dev/openapi.json
curl https://rpcs1.dev/llms.txt
```

Verify `https://rpcs1.dev/mcp` with an MCP client or inspector. A browser `GET`
can return `406`; that alone does not mean the MCP endpoint is broken.

## 4. Publish MCP Registry Metadata

The registry source of truth is `server.json`. After every `server.json` version
change, run the `Publish MCP Registry Metadata` GitHub Action.

Local fallback, if needed:

```bash
./mcp-publisher login github-oidc
./mcp-publisher publish
```

Then check the listing:

```text
https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.travisbergen2/rpcs1-agent-tuner
```

Do not call the server publicly listed until the registry search returns the
RPCS1 listing.

## 5. Publish SDK Packages

The Python SDK publish workflow is triggered by `sdk-v*` tags. For the current
release:

```bash
git tag sdk-v0.2.1
git push origin sdk-v0.2.1
```

The workflow builds `sdk/python`, runs tests, and publishes to PyPI using trusted
publishing. Confirm the GitHub `pypi` environment is configured before tagging.

If publishing npm packages later, publish `@rpcs1/core` before
`@rpcs1/mcp-server`, because the MCP package depends on the core package.

## 6. Glama and Directory Checks

Glama should build and launch the standalone STDIO MCP server, not the hosted
Streamable HTTP endpoint. Use the same config shown in the README:

```json
{
  "buildSteps": [
    "npm ci --include=optional",
    "npm run build --workspace=@rpcs1/core",
    "npm run build --workspace=@rpcs1/mcp-server"
  ],
  "cmdArguments": [
    "mcp-proxy",
    "--",
    "node",
    "packages/mcp-server/dist/index.js"
  ],
  "environmentVariablesJsonSchema": {
    "type": "object",
    "properties": {},
    "required": []
  },
  "placeholderArguments": {}
}
```

For directory health checks, confirm:

- A stable GitHub release exists for the current release, such as `v0.2.1`.
- The listing has recent successful MCP usage.
- `server.json` and README discovery metadata match the live endpoint.
- `glama.json` points to the STDIO build
  path above.

## 7. Analytics Checklist

Vercel Analytics and Speed Insights are already installed in
`packages/web/app/layout.tsx`.

After every production deploy, confirm:

- Vercel Analytics shows page views for `/`, `/tuner`, `/docs`, and `/docs/mcp`.
- Speed Insights is receiving Web Vitals for the production domain.
- Custom client events appear: `Tuner Viewed`, `Tuner Submitted`,
  `Recommendation Generated`, and `Tuner Failed`.
- API logs show `recommend_completed`, `recommend_rejected`, and
  `recommend_failed` events when exercising `/api/recommend`.
- MCP logs show `mcp_request` events after an MCP `initialize`, `tools/list`,
  and `tools/call` verification.
- Directory referrals from Glama, Smithery, MCP Registry, and other listings are
  visible in Vercel Analytics when those listings send traffic.

## 8. Stripe and Email

Before enabling paid flows in production:

- Stripe live products exist for Indie and Team.
- `STRIPE_SECRET_KEY`, `STRIPE_INDIE_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`, and
  `STRIPE_WEBHOOK_SECRET` are set in Vercel production env vars.
- Stripe webhook endpoint is `https://rpcs1.dev/api/webhooks/stripe`.
- Resend domain verification for `rpcs1.dev` is complete.
- `RESEND_API_KEY`, `EMAIL_FROM`, and `LICENSE_JWT_SECRET` are set.

Never rotate `LICENSE_JWT_SECRET` after production keys have been issued unless
you intend to invalidate existing license keys.
