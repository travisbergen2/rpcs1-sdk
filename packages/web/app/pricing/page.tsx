import type { Metadata } from 'next';
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
          <p className="text-sm text-gray-400 mb-5">no account · no ads · no catch</p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              'The box — see how your message reads before you send it',
              'The loop — dump it, lock the lines that are right, send a prompt that lands',
              'The Obsidian plugin — your own notes become the memory, and every round shows exactly what left your machine',
              'The second brain connector — those same notes, inside Claude Desktop, Cursor, and the other AI apps you already use, without leaving your machine',
              'The tuner and translator, docs and examples',
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
            Open the loop
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
          <p className="text-sm text-gray-400 mb-5">companies · schools · government</p>
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

      {/* FAQ */}
      <div className="rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-4">Questions</h2>
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
              a: 'It is part of an organization license: one deployed agent, one written decision memo — what it is doing, where it is likely to fail, the settings to change, and the next test to run. Ask about it when you get in touch about licensing.',
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
              <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
