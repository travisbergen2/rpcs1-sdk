import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { env } from '@/lib/env';
import { generateLicenseKey } from '@/lib/license';
import type { Tier } from '@/lib/license';

export const runtime = 'nodejs';

// Raw body is required for Stripe signature verification
export async function POST(req: NextRequest) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed — this is when money changes hands
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_details?.email ?? session.customer_email;
    const customerId    = session.customer as string;
    const subId         = session.subscription as string;
    const tier          = (session.metadata?.tier ?? 'indie') as Tier;

    if (!customerEmail) {
      console.error('[webhook] No customer email on session', session.id);
      return NextResponse.json({ ok: true }); // Acknowledge but log
    }

    try {
      // Generate license key
      const licenseKey = await generateLicenseKey({
        email:                  customerEmail,
        tier,
        stripeCustomerId:       customerId,
        stripeSubscriptionId:   subId,
        issuedAt:               Math.floor(Date.now() / 1000),
      });

      // Send email with license key
      if (env.RESEND_API_KEY) {
        const resend = new Resend(env.RESEND_API_KEY);
        await resend.emails.send({
          from:    env.EMAIL_FROM,
          to:      customerEmail,
          subject: 'Your RPCS-1 Agent Tuner license key',
          html:    buildEmailHtml({ tier, licenseKey, customerEmail }),
        });
        console.log(`[webhook] License key sent to ${customerEmail} (${tier})`);
      } else {
        // In dev/test, log the key so it's not lost
        console.log(`[webhook] RESEND not configured — license key for ${customerEmail}:`, licenseKey);
      }
    } catch (err) {
      console.error('[webhook] Failed to generate/send license key:', err);
      // Don't return 500 — Stripe will retry and we'd generate duplicate keys
      // TODO Phase 3+: idempotency key storage in DB
    }
  }

  // Handle subscription cancellations (future: revoke key, send confirmation email)
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    console.log(`[webhook] Subscription cancelled: ${sub.id}`);
    // No DB to update — key will still be valid until expiry
    // Phase 3+: add key to a revocation list
  }

  return NextResponse.json({ ok: true });
}

function buildEmailHtml({
  tier,
  licenseKey,
  customerEmail,
}: {
  tier: string;
  licenseKey: string;
  customerEmail: string;
}): string {
  const tierLabel = tier === 'indie' ? 'Indie ($40/month)' : 'Team ($400/month)';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1f2937; background: #fff;">
  <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">Your RPCS-1 license key</h1>
  <p style="color: #6b7280; margin-top: 0;">Plan: ${tierLabel}</p>

  <p>Hi ${customerEmail},</p>
  <p>Your RPCS-1 Agent Tuner license key is ready. Keep this email — the key is your
  entitlement record and is not stored on our servers.</p>

  <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0 0 8px; font-family: monospace;">LICENSE KEY</p>
    <p style="color: #38bdf8; font-family: monospace; font-size: 13px; word-break: break-all; margin: 0;">${licenseKey}</p>
  </div>

  <h2 style="font-size: 16px; font-weight: 600;">How to use it</h2>
  <p>Pass the key as a header in SDK API calls:</p>
  <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto;">
x-license-key: ${licenseKey}
# or
Authorization: Bearer ${licenseKey}
  </pre>
  <p>Or set it in your environment:</p>
  <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px;">
export RPCS1_LICENSE_KEY="${licenseKey}"
  </pre>

  <p>Questions? Reply to this email or visit <a href="https://rpcs1.dev/docs">rpcs1.dev/docs</a>.</p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
    RPCS-1 Agent Tuner · <a href="https://rpcs1.dev" style="color: #9ca3af;">rpcs1.dev</a>
  </p>
</body>
</html>
  `.trim();
}
