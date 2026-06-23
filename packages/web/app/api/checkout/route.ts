import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const PRICE_IDS: Record<string, string> = {
  indie: env.STRIPE_INDIE_PRICE_ID,
  team:  env.STRIPE_TEAM_PRICE_ID,
};

export async function GET(req: NextRequest) {
  const tier = req.nextUrl.searchParams.get('tier');

  if (!tier || !PRICE_IDS[tier]) {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  if (!env.STRIPE_SECRET_KEY) {
    // Stripe not configured — redirect to pricing with a note
    return NextResponse.redirect(new URL('/pricing?stripe=not-configured', req.url));
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata:    { tier },
      // Propagate tier onto the Subscription (and therefore its invoices) so the
      // invoice.paid webhook can read subscription.metadata.tier when issuing keys.
      subscription_data: { metadata: { tier } },
      allow_promotion_codes: true,
    });

    return NextResponse.redirect(session.url!);
  } catch (err) {
    console.error('[/api/checkout]', err);
    return NextResponse.redirect(new URL('/pricing?error=checkout-failed', req.url));
  }
}
