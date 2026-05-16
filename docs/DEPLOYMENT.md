# Deployment Guide

## Step 1 — Buy rpcs1.dev

Purchase `rpcs1.dev` from a domain registrar. Ionos works fine; Namecheap and Cloudflare Registrar are also good options. You don't need to transfer your other domains.

## Step 2 — Set up Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → Import Project → select your repo.
3. Set the **Root Directory** to `packages/web`.
4. Framework: Next.js (auto-detected).
5. Add all environment variables from `packages/web/.env.example`.
6. Deploy.

## Step 3 — Connect rpcs1.dev to Vercel

In Vercel → Project Settings → Domains → Add `rpcs1.dev` and `www.rpcs1.dev`.

Vercel will give you nameservers or A/CNAME records. In Ionos:

**Option A — Change nameservers (easier)**
1. Ionos Control Panel → Domains → `rpcs1.dev` → Nameservers.
2. Replace with Vercel's nameservers (shown in Vercel dashboard).
3. Propagation: 15 min – 48 hours.

**Option B — Keep Ionos DNS, add records**
1. Ionos Control Panel → Domains → `rpcs1.dev` → DNS.
2. Add an A record: `@` → `76.76.21.21` (Vercel IP).
3. Add a CNAME: `www` → `cname.vercel-dns.com`.

## Step 4 — Set up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com).
2. Create two products:
   - **RPCS-1 Indie** — $40/month recurring → copy the Price ID → `STRIPE_INDIE_PRICE_ID`
   - **RPCS-1 Team** — $400/month recurring → copy the Price ID → `STRIPE_TEAM_PRICE_ID`
3. API Keys → copy Secret Key → `STRIPE_SECRET_KEY`
4. Webhooks → Add endpoint: `https://rpcs1.dev/api/webhooks/stripe`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

## Step 5 — Set up Resend

1. Create account at [resend.com](https://resend.com).
2. Add your domain `rpcs1.dev` (they'll give you DNS records to add in Ionos).
3. Create an API key → `RESEND_API_KEY`.
4. Set `EMAIL_FROM=noreply@rpcs1.dev`.

## Step 6 — Generate LICENSE_JWT_SECRET

```bash
openssl rand -hex 32
```

Paste result into `LICENSE_JWT_SECRET`. This secret signs all license keys — **never change it after going live** (existing keys would become invalid).

## Step 7 — Publish Python SDK to PyPI

```bash
# Reserve the package name
pip install twine

cd sdk/python
python -m build

# Test upload first
twine upload --repository testpypi dist/*

# Then live
twine upload dist/*
```

Or trigger the GitHub Action by pushing a tag:
```bash
git tag sdk-v0.1.0
git push origin sdk-v0.1.0
```

Set `PYPI_API_TOKEN` in GitHub repository secrets.

## Step 8 — Switch Stripe to live mode

1. Stripe Dashboard → toggle from **Test** to **Live**.
2. Re-create the two products in live mode.
3. Update `STRIPE_SECRET_KEY`, `STRIPE_INDIE_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` in Vercel env vars.

## Pre-launch checklist

- [ ] `rpcs1.dev` resolves and shows the landing page
- [ ] SSL/HTTPS active (Vercel handles this automatically)
- [ ] Test Stripe checkout in test mode: pay → check email → verify license key validates
- [ ] `pip install rpcs1` works from a clean machine
- [ ] Webhook fires correctly (check Stripe webhook logs)
- [ ] Rate limiting works (make 11 requests from same IP, 11th should 429)
- [ ] Plausible analytics installed (add script tag to layout.tsx)
- [ ] Sentry error tracking installed (`npm install @sentry/nextjs`)

## Your other Ionos domains

You own 4 domains. The others can be used as redirects if desired:

```
fractalyouniverse.org → redirect to rpcs1.dev (set up in Ionos redirect manager)
```

Or park them for future products.
