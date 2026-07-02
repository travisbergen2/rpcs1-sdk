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

  // ── Issue / re-issue the license key on every PAID invoice ──────────────────
  // invoice.paid fires for the first payment (billing_reason = 'subscription_create')
  // AND for every renewal ('subscription_cycle'). Each key carries
  // exp = subscription.current_period_end, so on cancellation no further invoice
  // fires and the last key simply expires at period end — no revocation list,
  // no database.
  //
  // NOTE: the field paths below (invoice.subscription, subscription.current_period_end)
  // are correct for the pinned Stripe apiVersion '2024-04-10'. If you bump the API
  // version, re-check them — they moved in later versions.
  //
  // Requires the 'invoice.paid' event to be enabled on this webhook endpoint in the
  // Stripe dashboard (Developers → Webhooks). 'checkout.session.completed' is no
  // longer used for key issuance.
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = invoice.subscription as string | null;
    if (!subId) {
      return NextResponse.json({ ok: true }); // not a subscription invoice
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subId);
      const periodEnd = subscription.current_period_end;            // unix seconds → exp
      const tier = (subscription.metadata?.tier ?? 'indie') as Tier;

      // Resolve the customer email (invoice usually carries it; fall back to Customer)
      let email = invoice.customer_email;
      if (!email) {
        const cust = await stripe.customers.retrieve(invoice.customer as string);
        if (!('deleted' in cust)) email = cust.email;
      }
      if (!email) {
        console.error('[webhook] No customer email for invoice', invoice.id);
        return NextResponse.json({ error: 'customer email unavailable' }, { status: 500 });
      }

      const licenseKey = await generateLicenseKey({
        email,
        tier,
        stripeCustomerId:     invoice.customer as string,
        stripeSubscriptionId: subId,
        issuedAt:             Math.floor(Date.now() / 1000),
        expiresAt:            periodEnd,
      });

      const isRenewal = invoice.billing_reason === 'subscription_cycle';

      if (env.RESEND_API_KEY) {
        const resend = new Resend(env.RESEND_API_KEY);
        await resend.emails.send({
          from:    env.EMAIL_FROM,
          to:      email,
          subject: isRenewal
            ? 'Your RPCS-1 Agent Tuner license key (renewed)'
            : 'Your RPCS-1 Agent Tuner license key',
          html:    buildEmailHtml({ tier, licenseKey, customerEmail: email, isRenewal }),
        });
        console.log(`[webhook] License key ${isRenewal ? 're-issued' : 'sent'} to ${email} (${tier})`);
      } else {
        // In dev/test, log the key so it's not lost
        console.log(`[webhook] RESEND not configured — license key for ${email}:`, licenseKey);
      }
    } catch (err) {
      console.error('[webhook] Failed to generate/send license key:', err);
      // Return 5xx so Stripe retries. The throw happens before (or during) the email
      // send, so a retry does not double-deliver a key. Stripe's at-least-once delivery
      // can still re-send a *successful* invoice.paid; that would email a second, equally
      // valid key for the same period (harmless). Add event-id idempotency storage if/when
      // a datastore exists.
      return NextResponse.json({ error: 'key issuance failed' }, { status: 500 });
    }
  }

  // ── Cancellations ───────────────────────────────────────────────────────────
  // No action needed: the customer's current key already carries
  // exp = period end, so access lapses automatically when the paid period ends.
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    console.log(`[webhook] Subscription cancelled: ${sub.id} — key expires at period end`);
  }

  return NextResponse.json({ ok: true });
}

function buildEmailHtml({
  tier,
  licenseKey,
  customerEmail,
  isRenewal,
}: {
  tier: string;
  licenseKey: string;
  customerEmail: string;
  isRenewal?: boolean;
}): string {
  // Display names for the founding-era pricing. Internal tier keys are stable
  // plumbing: 'founding' = yearly supporter, 'indie' = monthly supporter.
  const tierLabel = tier === 'founding'
    ? 'Founding supporter ($79/year)'
    : tier === 'indie' ? 'Founding supporter ($9/month)' : 'Team';
  const intro = isRenewal
    ? 'Your RPCS-1 Agent Tuner subscription renewed — here is your license key for the new billing period. It replaces the previous one.'
    : 'Your RPCS-1 Agent Tuner license key is ready. Keep this email — the key is your entitlement record and is not stored on our servers.';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1f2937; background: #fff;">
  <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">Your RPCS-1 license key</h1>
  <p style="color: #6b7280; margin-top: 0;">Plan: ${tierLabel}</p>

  <p>Hi ${customerEmail},</p>
  <p>${intro}</p>

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
