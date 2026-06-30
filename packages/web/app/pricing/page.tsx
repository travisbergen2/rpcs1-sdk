import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'RPCS-1 pricing — free translator, $200/yr founding, $40/mo indie, $400/mo team, $750 one-time diagnostic.',
};

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Translator Hub for intent extraction, ambiguity resolution, rewriting, and task routing.',
    cta: 'Try Translator',
    ctaHref: '/translator',
    features: ['Interpret, normalize, split', '6 rewrite styles', 'Task routing', 'RPCS-1 scoring engine', 'Community support'],
    badge: 'always free',
  },
  {
    name: 'Founding',
    price: '$200',
    period: 'per year',
    description: 'Early supporter access. Lock in the lowest rate for as long as your subscription stays active.',
    cta: 'Get Founding',
    ctaHref: '/api/checkout?tier=founding',
    features: ['Everything in Free', 'License key for SDK', 'Rate limit: 1,000 req/day', 'Email support', 'Founding member badge'],
    badge: 'best value',
  },
  {
    name: 'Indie',
    price: '$40',
    period: 'per month',
    description: 'For individual builders shipping AI agents into production.',
    cta: 'Get Indie',
    ctaHref: '/api/checkout?tier=indie',
    features: ['Everything in Free', 'License key for SDK', 'Rate limit: 5,000 req/day', 'Email support', 'MCP server access'],
    badge: 'popular',
  },
  {
    name: 'Team',
    price: '$400',
    period: 'per month',
    description: 'For teams running multiple agents with shared infrastructure.',
    cta: 'Get Team',
    ctaHref: '/api/checkout?tier=team',
    features: ['Everything in Indie', 'Rate limit: 25,000 req/day', 'Priority support', 'Multi-model routing', 'Custom integrations', 'Team dashboard'],
    badge: null,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Pricing</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Start free with the Translator Hub. Upgrade for API access, higher rate limits, and support.
        </p>
      </div>

      {/* Diagnostic section */}
      <section id="diagnostic" className="mb-12 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-sky-500/5 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="paid">Paid diagnostic</Badge>
              <span className="text-sm text-gray-500">One-time purchase</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Written Agent Diagnostic Report
            </h2>
            <p className="text-gray-400 leading-relaxed">
              One written decision memo for one deployed agent. Submit a brief after checkout, get a
              structured report with the five-primitive profile, failure-risk score, recommended runtime
              posture, and the next test to run. Delivered to your inbox.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Five-primitive profile', 'Failure-risk score', 'Recommended posture', 'Next test'].map((item) => (
                <span key={item} className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Link
              href="/api/checkout?tier=diagnostic"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Buy $750 diagnostic →
            </Link>
            <Link
              href="/diagnostic"
              className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
            >
              Submit a brief
            </Link>
          </div>
        </div>
      </section>

      {/* Subscription tiers */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {TIERS.map((tier) => (
          <div key={tier.name} className="rounded-xl border border-gray-800 bg-gray-950 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              {tier.badge && (
                <Badge variant={tier.name === 'Free' ? 'neutral' : tier.name === 'Founding' ? 'paid' : 'paid'}>
                  {tier.badge}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-white mb-1">{tier.price}</p>
            <p className="text-sm text-gray-500 mb-4">/{tier.period}</p>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">{tier.description}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-gray-400">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={tier.ctaHref}
              className={`inline-flex items-center justify-center rounded-lg w-full px-4 py-2.5 text-sm font-semibold transition-colors text-center ${
                tier.name === 'Free'
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                  : tier.name === 'Founding'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { q: 'What do I get with the free tier?', a: 'Full access to the Translator Hub at /translator — interpret, normalize, split, rewrite, route, and score. No API key needed.' },
            { q: 'How does the diagnostic work?', a: 'Buy the $750 diagnostic, submit a brief about one agent or workflow, and get a structured report with primitives, risk score, posture, and next tests delivered to your inbox.' },
            { q: 'What is the Founding tier?', a: 'Early supporter pricing at $200/year. Lock in the lowest rate while the platform grows. Includes a license key and SDK access.' },
            { q: 'Does the SDK send data to your servers?', a: 'No. The recommend() and translator functions are pure local computation. License key validation is a local JWT check. Nothing is sent to rpcs1.dev at call time.' },
            { q: 'Can I upgrade or downgrade?', a: 'Yes. Upgrade anytime. Downgrades take effect at the end of the current billing period.' },
            { q: 'What payment methods do you accept?', a: 'All major credit cards via Stripe. Promotion codes are supported at checkout.' },
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
