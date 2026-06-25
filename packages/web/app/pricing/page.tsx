import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { TrackedLink } from '@/components/TrackedLink';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'RPCS-1 pricing — free sample assessment, paid diagnostic report, and team workflows.',
};

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try a sample configuration assessment. No credit card required.',
    cta: 'Try free sample',
    ctaHref: '/tuner',
    variant: 'secondary' as const,
    features: [
      '10 web tuner recommendations per hour',
      'All four platforms (Anthropic, OpenAI, open source, generic)',
      'Failure-risk diagnosis with plain-English reasoning',
      'Consistency / grounding / stalled-resolution warnings',
      '5 Python SDK calls per day',
      'Community support (GitHub)',
    ],
  },
  {
    name: 'Indie',
    price: '$40',
    period: 'per month',
    description: 'Repeatable local assessments for builders shipping AI into production.',
    cta: 'Get Indie',
    ctaHref: '/api/checkout?tier=indie',
    variant: 'primary' as const,
    highlighted: true,
    features: [
      'Everything in Free',
      'Unlimited Python SDK calls',
      'License key delivered by email',
      'Structured exports for eval and implementation workflows',
      'Multi-platform comparison in one call',
      'Email support (2-day response)',
    ],
  },
  {
    name: 'Team',
    price: '$400',
    period: 'per month',
    description: 'For AI product, support engineering, and quality teams.',
    cta: 'Get Team',
    ctaHref: '/api/checkout?tier=team',
    variant: 'secondary' as const,
    features: [
      'Everything in Indie',
      'Up to 10 developer seats',
      'Multi-agent team composer (planned)',
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
          Start with a free sample assessment. Pay when you want a written diagnostic your team can use.
        </p>
      </div>

      <section id="diagnostic" className="mb-8 border border-sky-500/40 bg-gray-900 rounded-xl p-6 sm:p-8">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="paid">Paid diagnostic</Badge>
              <span className="text-sm text-gray-500">Best for teams shipping agents now</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Agent Diagnostic Report</h2>
            <p className="text-gray-400 max-w-2xl">
              A one-time review for a deployed agent, support copilot, or workflow assistant.
              You get a failure-risk score, recommended runtime posture, implementation priorities,
              and a concise report you can share internally.
            </p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-gray-400">
              {[
                'One workload reviewed by RPCS-1',
                'Failure-risk diagnosis and stability regime',
                'Implementation settings and next-test recommendations',
                '30-minute follow-up call by email request',
              ].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:text-right">
            <div className="mb-4">
              <span className="text-4xl font-bold text-white">$750</span>
              <span className="text-sm text-gray-500 ml-1">one-time</span>
            </div>
            <TrackedLink
              href="/api/checkout?tier=diagnostic"
              eventName="Checkout Started"
              eventData={{ location: 'diagnostic_offer', tier: 'diagnostic' }}
              className="inline-flex w-full lg:w-auto justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
            >
              Buy the diagnostic
            </TrackedLink>
            <Link
              href="/diagnostic"
              className="mt-3 inline-flex w-full lg:w-auto justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
            >
              Submit the intake brief
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              Start with one review. If you need recurring checks, move to the SDK or team plan.
            </p>
          </div>
        </div>
      </section>

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
        <p className="text-gray-500 text-sm mb-2">Need procurement support, a security review, or a custom integration?</p>
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
              q: 'What do I get with the diagnostic?',
              a: 'A written scorecard, failure-risk diagnosis, recommended runtime posture, and implementation priorities for the agent you submit.',
            },
            {
              q: 'Can I start free?',
              a: 'Yes. The web tuner includes a free sample assessment. Use it to test the workflow before paying for a report.',
            },
            {
              q: 'What is the free tier rate limit?',
              a: 'The web tuner allows 10 recommendations per hour. The Python SDK includes 5 free calls per day.',
            },
            {
              q: 'Does the SDK send data to your servers?',
              a: 'License key validation is a local JWT check — no network call. The recommend() function is pure computation. Nothing is sent to rpcs1.dev at call time.',
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
