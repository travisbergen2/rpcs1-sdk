import type { Metadata } from 'next';
import { EvidenceCard } from '@/components/EvidenceCard';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { SupportLink } from '@/components/SupportLink';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free for people. Licensed for organizations. Everything an individual touches is free — no account, no ads, no tiers. Companies, schools, and agencies license it for their people.',
};

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Free for people. Licensed for organizations.
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          If you&apos;re a person, everything here is yours — no account, no ads, no tiers, no
          card. If you&apos;re a company, school, or agency putting it in front of your people,
          you license it. That&apos;s the whole model.
        </p>
      </div>

      {/* Two panels */}
      <div className="grid lg:grid-cols-2 gap-6 mb-12">
        {/* People */}
        <div className="rounded-2xl border border-sky-500/40 bg-gray-950 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-white">People</h2>
            <Badge variant="neutral">free forever</Badge>
          </div>
          <p className="text-4xl font-bold text-white mb-1">$0</p>
          <p className="text-sm text-gray-500 mb-5">no account · no ads · no catch</p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              'The box — see how your message reads before you send it',
              'The loop — dump it, lock the lines that are right, send a prompt that lands',
              'The Obsidian plugin — your own notes become the memory, and every round shows exactly what left your machine',
              'The tuner and translator, docs and examples',
              'Works with the AI tools you already use',
            ].map((f) => (
              <li key={f} className="flex gap-2 text-sm text-gray-400">
                <span className="text-emerald-400 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/loop"
            className="inline-flex items-center justify-center rounded-lg w-full px-4 py-2.5 text-sm font-semibold transition-colors text-center bg-sky-500 hover:bg-sky-400 text-slate-950"
          >
            Try the loop — nothing to sign up for
          </Link>
          <SupportLink />
        </div>

        {/* Organizations */}
        <div className="rounded-2xl border border-amber-500/40 bg-gray-950 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-white">Organizations</h2>
            <Badge variant="paid">licensed</Badge>
          </div>
          <p className="text-4xl font-bold text-white mb-1">Let&apos;s talk</p>
          <p className="text-sm text-gray-500 mb-5">companies · schools · government</p>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Your people may already use it free. Licensing makes it official: supported,
            private, and in writing — the way accommodation tools are supposed to arrive.
          </p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              'Site licenses — official access for your whole team, campus, or agency',
              'Privacy commitments in writing (what leaves a machine is always shown — that is the product, not a promise)',
              'The written agent diagnostic for teams running their own AI',
              'Connect it to your own systems — developer docs one click away',
              'A human who answers: support, onboarding, accessibility questions',
            ].map((f) => (
              <li key={f} className="flex gap-2 text-sm text-gray-400">
                <span className="text-emerald-400 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/institutions"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors text-center bg-amber-500 hover:bg-amber-400 text-slate-950"
            >
              For schools &amp; workplaces →
            </Link>
            <a
              href="mailto:travisbergen2@gmail.com?subject=Licensing%20for%20our%20organization&body=Organization%3A%20%0AHow%20many%20people%3A%20%0AWhat%20your%20people%20need%20it%20for%3A%20%0A"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors text-center border border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              Talk to me
            </a>
          </div>
        </div>
      </div>

      {/* Founding pilot — the organizations-side front door (kept, staged honestly) */}
      <section
        id="diagnostic"
        className="mb-12 rounded-2xl border border-gray-800 bg-gradient-to-r from-amber-500/5 to-sky-500/5 p-6 sm:p-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="paid">For teams running AI</Badge>
              <span className="text-sm text-gray-500">One-time · staged honestly</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Written Agent Diagnostic — first 3 free, then $99
            </h2>
            <p className="text-gray-400 leading-relaxed">
              One written decision memo for one deployed agent: what it&apos;s doing, where it&apos;s
              likely to fail, the settings to change, and the next test to run — delivered to
              your inbox. Staged the same way we publish claims: the first{' '}
              <strong className="text-white">three case-study seats are free</strong> in exchange
              for an anonymized public case study — you get the memo, we earn the receipts. Once
              those are published, the next seats pay the{' '}
              <strong className="text-white">$99 founding rate</strong> with the evidence in
              front of them. No one is asked to pay for an unproven service.
            </p>
            <div className="mt-4">
              <EvidenceCard compact />
            </div>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Link
              href="/diagnostic"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Claim a free case-study seat →
            </Link>
            <Link
              href="/api/checkout?tier=diagnostic"
              className="inline-flex items-center justify-center rounded-lg border border-amber-500/40 px-6 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              Skip the queue — $99, no case study
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div className="rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Honest questions, honest answers</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              q: 'Why is it free for people?',
              a: 'Because the whole point is that being understood should not have a price tag. The people this is built for are exactly the people paywalls filter out. Organizations that put it in front of their people pay — that is what keeps the free side free.',
            },
            {
              q: 'Is there a catch — ads, data, upsells?',
              a: 'No ads, ever. No selling data, ever — the product literally shows you every piece of text that leaves your machine, which would make that lie impossible to hide. And there is no paid tier for individuals to be upsold into.',
            },
            {
              q: 'What do organizations actually pay for?',
              a: 'Making it official for their people: a site license, written privacy commitments, support with a human behind it, and connecting it to their own systems. The open-source code stays open source — what organizations buy is the hosted service and the guarantees around it.',
            },
            {
              q: 'How does the written diagnostic work?',
              a: 'Two stages. First: three free case-study seats — submit a brief about one agent, get the full written memo, and agree to an anonymized public case study. Second: once those are published, seats pay the $99 founding rate with the receipts visible before you buy. You can skip the free queue anytime by paying $99 with no case-study obligation.',
            },
            {
              q: 'Does any of this send my writing somewhere?',
              a: 'Only what you can see. The loop sends the text you typed to get interpreted, and the plugin shows you every snippet it sends — by name, with its size — every single round. Nothing else leaves. That disclosure is enforced by the software, not by policy.',
            },
            {
              q: 'What payment methods do organizations use?',
              a: 'Cards via Stripe today; invoicing and purchase orders as licensing grows. Payment only ever applies to organizations — there is nothing for an individual to buy.',
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
