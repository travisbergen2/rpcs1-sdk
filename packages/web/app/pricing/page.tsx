import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'RPCS-1 pricing — free sample, one-time five-primitive memo, and recurring access for teams.',
};

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try a sample configuration assessment. No credit card required.',
    cta: 'Try free sample',
    ctaHref: '/tuner',
  },
  {
    name: 'Indie',
    price: '$40',
    period: 'per month',
    description: 'Repeatable local assessments for builders shipping AI into production.',
    cta: 'Get Indie',
    ctaHref: '/api/checkout?tier=indie',
  },
  {
    name: 'Team',
    price: '$400',
    period: 'per month',
    description: 'For AI product, support engineering, and quality teams.',
    cta: 'Get Team',
    ctaHref: '/api/checkout?tier=team',
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Pricing</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Start free. Buy a written diagnostic when one workflow needs a clear answer before rollout.
        </p>
      </div>

      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-950/70 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-amber-400 mb-3">fast buyer path</p>
            <h2 className="text-2xl font-semibold text-white mb-2">Free sample first. Paid memo when the workflow matters.</h2>
            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
              The shortest path is simple: check a sample configuration, then buy the written diagnostic if you want a concrete answer before rollout.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/tuner"
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
            >
              Run free sample
            </Link>
            <Link
              href="/api/checkout?tier=diagnostic"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Buy $750 diagnostic
            </Link>
          </div>
        </div>
      </section>

      <section id="diagnostic" className="mb-8 border border-sky-500/40 bg-gray-900 rounded-xl p-6 sm:p-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="paid">Paid diagnostic</Badge>
              <span className="text-sm text-gray-500">Best for one workflow that needs a written answer now</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Written Agent Diagnostic Report</h2>
            <p className="text-gray-400 max-w-2xl">
              For $750, you get a written decision memo for one deployed agent, support copilot, or workflow assistant.
              Send one workload, one failure mode, and the context around it. I return the risk score,
              recommended runtime posture, implementation priorities, and the next test to run.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['One agent or workflow', 'One failure mode', 'Written report', 'Implementation settings'].map((item) => (
                <span key={item} className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300">
                  {item}
                </span>
              ))}
            </div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-gray-400">
              {[
                'Failure-risk score and stability regime',
                'Recommended runtime posture',
                'Next-test recommendations',
                'One brief, after checkout',
              ].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex w-full sm:w-auto justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Buy report, then submit brief
              </Link>
              <Link
                href="/diagnostic"
                className="inline-flex w-full sm:w-auto justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
              >
                See intake brief
              </Link>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              After checkout, you’ll land on /diagnostic and submit one brief. No second purchase step.
            </p>
            <p className="mt-4 text-sm text-gray-400">
              Good fit for support automation, AI QA, and internal copilots when the team wants a concrete answer before rollout.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs font-mono text-sky-400 mb-3">sample report preview</p>
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300">
                  risk score <span className="text-sky-400">82</span>
                </span>
                <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300">
                  posture <span className="text-emerald-400">cautious</span>
                </span>
              </div>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Primary failure mode</p>
                  <p>Oscillation under live queue pressure and incomplete grounding.</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Recommended change</p>
                  <p>Raise filtering, lower commitment pressure, and add a tighter handoff rule.</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Next test</p>
                  <p>Retest with three ambiguous cases and one escalation path.</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-white">$750</p>
                  <p className="text-xs text-gray-500">one-time written report</p>
                </div>
                <span className="text-xs text-gray-500 text-right">After checkout, submit one brief.</span>
              </div>
            <div className="mt-4 rounded-lg border border-sky-500/15 bg-sky-500/5 p-3">
              <p className="text-xs font-mono text-sky-400 mb-2">sample output</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-gray-300">
                  regime <span className="text-sky-400">stable</span>
                  </span>
                  <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-gray-300">
                    posture <span className="text-emerald-400">cautious</span>
                  </span>
                  <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-gray-300">
                    next test <span className="text-amber-400">3 ambiguous cases</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Recurring access</h2>
            <p className="text-sm text-gray-500">
              Secondary path only. Use these once the workflow is already worth running regularly across a team or workspace.
            </p>
          </div>
          <span className="text-xs text-gray-500">Secondary path</span>
        </div>
        <div className="space-y-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col gap-4 rounded-lg border border-gray-800 bg-gray-950 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant={tier.name === 'Free' ? 'neutral' : 'paid'}>{tier.name}</Badge>
                  <span className="text-sm text-gray-400">
                    <span className="font-semibold text-white">{tier.price}</span> / {tier.period}
                  </span>
                </div>
                <p className="text-sm text-gray-500 max-w-2xl">{tier.description}</p>
              </div>

              <Link
                href={tier.ctaHref}
                className={[
                  'inline-flex w-full sm:w-auto justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                  tier.name === 'Free'
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20',
                ].join(' ')}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-sky-500/15 bg-sky-500/5 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono text-amber-400 mb-2">enterprise rollout</p>
            <h2 className="text-xl font-semibold text-white mb-2">Need procurement, security, or a custom rollout?</h2>
            <p className="text-sm text-gray-400 max-w-2xl">
              Keep the diagnostic as the entry point, then move to invoice billing and integration scoping.
            </p>
          </div>
          <a
            href="mailto:travisbergen2@gmail.com?subject=RPCS-1 Enterprise"
            className="inline-flex items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/15 transition-colors"
          >
            Contact for Enterprise →
          </a>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              title: 'Invoice billing',
              body: 'Keep checkout simple for the founder path, then move procurement to a direct billing conversation.',
            },
            {
              title: 'Security review',
              body: 'Share the operating model, data handling, and SDK behavior before a broader rollout.',
            },
            {
              title: 'Custom integration',
              body: 'Scope workspace, workflow, or product integrations once the first diagnostic proves fit.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-sky-500/15 bg-gray-950/60 p-4">
              <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              q: 'What do I get with the diagnostic?',
              a: 'A written scorecard for one agent or workflow, with the failure mode, recommended runtime posture, and implementation priorities.',
            },
            {
              q: 'Can I start free?',
              a: 'Yes. The web tuner includes a free sample assessment. Use it to test the workflow before paying for a written report.',
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
