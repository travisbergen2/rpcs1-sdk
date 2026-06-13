import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { TrackedLink } from '@/components/TrackedLink';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'RPCS-1 Agent Tuner pricing — free web tuner, $40/month indie SDK, $400/month team.',
};

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Full access to the web tuner. No credit card required.',
    cta: 'Open the tuner',
    ctaHref: '/tuner',
    variant: 'secondary' as const,
    features: [
      'Unlimited web tuner usage',
      'All four platforms (Anthropic, OpenAI, open source, generic)',
      'Predicted regime + reasoning',
      'Oscillation / overload / freeze warnings',
      '5 Python SDK calls per day',
      'Community support (GitHub)',
    ],
  },
  {
    name: 'Indie',
    price: '$40',
    period: 'per month',
    description: 'Full SDK access for solo developers and small projects.',
    cta: 'Get Indie',
    ctaHref: '/api/checkout?tier=indie',
    variant: 'primary' as const,
    highlighted: true,
    features: [
      'Everything in Free',
      'Unlimited Python SDK calls',
      'License key delivered by email',
      'Advanced exports: JSON config, full system prompts, YAML',
      'Multi-platform comparison in one call',
      'Email support (2-day response)',
    ],
  },
  {
    name: 'Team',
    price: '$400',
    period: 'per month',
    description: 'Up to 10 developers. Custom integrations. Slack support.',
    cta: 'Get Team',
    ctaHref: '/api/checkout?tier=team',
    variant: 'secondary' as const,
    features: [
      'Everything in Indie',
      'Up to 10 developer seats',
      'Multi-agent team composer (Phase 2)',
      'Custom platform integrations (your internal API)',
      'Slack support channel',
      'Priority response (same business day)',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Pricing</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Start free. Pay when the SDK saves you meaningful debugging time.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 items-start">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={tier.highlighted ? 'border-sky-500/50 bg-gray-900 relative' : ''}
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="paid">Most popular</Badge>
              </div>
            )}
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-gray-400 mb-1">{tier.name}</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-gray-500">{tier.period}</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">{tier.description}</p>

              <TrackedLink
                href={tier.ctaHref}
                eventName={tier.name === 'Free' ? 'Pricing Tuner Clicked' : 'Checkout Started'}
                eventData={{ location: 'pricing_card', tier: tier.name.toLowerCase() }}
                className={[
                  'block w-full text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all mb-6',
                  tier.highlighted
                    ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700',
                ].join(' ')}
              >
                {tier.cta}
              </TrackedLink>

              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-gray-400">
                    <svg
                      className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm mb-2">Need an enterprise contract or custom integration?</p>
        <a
          href="mailto:travisbergen2@gmail.com?subject=RPCS-1 Enterprise"
          className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
        >
          Contact for Enterprise →
        </a>
      </div>

      <div className="mt-16 rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              q: 'What is a license key?',
              a: "After payment, you receive a JWT license key by email. Pass it as Authorization: Bearer <key> or x-license-key in API requests. No account login needed.",
            },
            {
              q: 'Can I cancel anytime?',
              a: "Yes. Cancel in Stripe's customer portal. Your key remains valid until the end of the billing period.",
            },
            {
              q: 'What is the free tier rate limit?',
              a: "5 Python SDK calls per day on the free tier. Web tuner is unlimited on all tiers.",
            },
            {
              q: 'Does the SDK send data to your servers?',
              a: "License key validation is a local JWT check — no network call. The recommend() function is pure computation. Nothing is sent to rpcs1.dev at call time.",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="text-sm font-semibold text-gray-200 mb-1.5">{q}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
