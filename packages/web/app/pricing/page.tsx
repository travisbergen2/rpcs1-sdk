import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'RPCS-1 pricing — everything self-serve is free. Founding supporter $9/mo or $79/yr (will be $40/mo at v1). $99 founding pilot diagnostic for the first five.',
};

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Free while we earn it</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Everything self-serve is free — the tuner, the translator, and the public MCP server.
          Paying today is backing the project early, at an early price.
        </p>
      </div>

      {/* Founding pilot */}
      <section id="diagnostic" className="mb-12 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-sky-500/5 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="paid">Founding pilot</Badge>
              <span className="text-sm text-gray-500">One-time · first five only</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Written Agent Diagnostic — $99 founding pilot
            </h2>
            <p className="text-gray-400 leading-relaxed">
              One written decision memo for one deployed agent: the five-primitive profile,
              failure-risk score, recommended runtime posture, and the next test to run —
              delivered to your inbox. Founding-pilot terms: the first five pilots pay $99
              instead of the eventual full price, and in exchange agree to an anonymized
              public case study of the engagement.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Five-primitive profile', 'Failure-risk score', 'Recommended posture', 'Next test', 'Anonymized case study'].map((item) => (
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
              Get the $99 founding pilot →
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

      {/* Tiers */}
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {/* Free */}
        <div className="rounded-xl border border-sky-500/40 bg-gray-950 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Free</h3>
            <Badge variant="neutral">always free</Badge>
          </div>
          <p className="text-3xl font-bold text-white mb-1">$0</p>
          <p className="text-sm text-gray-500 mb-4">forever</p>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            The whole self-serve product: tuner, translator, and the public MCP server.
          </p>
          <ul className="space-y-2 mb-6 flex-1">
            {['Full tuner at /tuner', 'Translator: interpret, normalize, split, rewrite, route, score', 'Public MCP server (rpcs1.dev/mcp)', 'Docs and examples', 'Community support'].map((f) => (
              <li key={f} className="flex gap-2 text-sm text-gray-400">
                <span className="text-emerald-400 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/tuner"
            className="inline-flex items-center justify-center rounded-lg w-full px-4 py-2.5 text-sm font-semibold transition-colors text-center bg-sky-500 hover:bg-sky-400 text-slate-950"
          >
            Start free
          </Link>
        </div>

        {/* Founding supporter */}
        <div className="rounded-xl border border-emerald-500/40 bg-gray-950 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Founding supporter</h3>
            <Badge variant="paid">early price</Badge>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            $9<span className="text-base font-medium text-gray-400">/mo</span>
            <span className="mx-2 text-gray-600">·</span>
            $79<span className="text-base font-medium text-gray-400">/yr</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            <span className="line-through">$40/mo</span> at v1 — founding rate locks while your subscription stays active
          </p>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            For people who want the SDK key and want this project to exist. Early risk, early price.
          </p>
          <ul className="space-y-2 mb-6 flex-1">
            {['Everything in Free', 'License key for the SDK', 'Rate limit: 5,000 req/day', 'Email support', 'Founding member badge'].map((f) => (
              <li key={f} className="flex gap-2 text-sm text-gray-400">
                <span className="text-emerald-400 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/api/checkout?tier=indie"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            >
              $9 monthly
            </Link>
            <Link
              href="/api/checkout?tier=founding"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors text-center border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
            >
              $79 yearly
            </Link>
          </div>
        </div>

        {/* Teams */}
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Teams</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-1">Let’s talk</p>
          <p className="text-sm text-gray-500 mb-4">shaped around your agents</p>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Multiple agents, shared infrastructure, custom integrations. Team pricing gets set
            with the first teams — tell me what you’re running.
          </p>
          <ul className="space-y-2 mb-6 flex-1">
            {['Everything in Founding supporter', 'Higher rate limits', 'Priority support', 'Multi-model routing', 'Custom integrations'].map((f) => (
              <li key={f} className="flex gap-2 text-sm text-gray-400">
                <span className="text-emerald-400 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href="mailto:travisbergen2@gmail.com?subject=RPCS-1%20for%20our%20team"
            className="inline-flex items-center justify-center rounded-lg w-full px-4 py-2.5 text-sm font-semibold transition-colors text-center border border-gray-700 text-gray-200 hover:bg-gray-800"
          >
            Talk to me
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { q: 'What do I get with the free tier?', a: 'The whole self-serve product: the tuner at /tuner, the Translator Hub at /translator, and the public MCP server. No API key, no account.' },
            { q: 'How does the $99 founding pilot work?', a: 'First five only: buy the pilot, submit a brief about one agent or workflow, and get the full written memo — primitives, risk score, posture, next tests. In exchange you agree to an anonymized public case study. Price rises when the five seats are gone.' },
            { q: 'What is the Founding supporter tier?', a: 'Early-supporter pricing: $9/month or $79/year, versus $40/month at v1. The rate locks for as long as your subscription stays active. Includes the SDK license key.' },
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
