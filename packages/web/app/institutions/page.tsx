import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'For schools & workplaces',
  description:
    'Your students and employees may already use Explicit Formula free. Licensing makes it official: supported, private, in writing — the way accommodation tools are supposed to arrive.',
};

const CONTACT =
  'mailto:travisbergen2@gmail.com?subject=Site%20license%20inquiry&body=Organization%3A%20%0ARole%3A%20%0AHow%20many%20people%3A%20%0AWhat%20prompted%20this%20(accommodation%20request%2C%20accessibility%20review%2C%20team%20need)%3A%20%0A';

export default function InstitutionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
      <div className="mb-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300/90 mb-3">
          For schools, workplaces &amp; agencies
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Some of your people spend all day translating themselves.
          <br />
          This is the ramp.
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
          Explicit Formula helps people say what they mean and be read the way they intended —
          in messages, in prompts, in the writing your organization runs on. Individuals use it
          free, forever. A license is how your organization makes it official: supported,
          private, and in writing.
        </p>
      </div>

      {/* Why institutions license it */}
      <section className="mb-12 grid sm:grid-cols-3 gap-4">
        {[
          {
            h: 'It fits the obligation you already have',
            p: 'Communication accommodations are covered territory — ADA in the workplace, Section 508 for federal tools, disability services in education. Licensing a tool your people already reach for is often the simplest accommodation you will approve this year.',
          },
          {
            h: 'Privacy your review can actually verify',
            p: 'The software shows every piece of text that leaves a machine — named, sized, every time. Nothing is collected silently, nothing is sold, and the open-source code means your security review can read exactly what it does. FERPA-conscious by architecture, not by promise.',
          },
          {
            h: 'It arrives already adopted',
            p: 'This follows the path your writing-support tools took: individuals adopt it free, then the institution licenses it so it is official and supported. You are not betting on adoption — you are catching up to it.',
          },
        ].map(({ h, p }) => (
          <div key={h} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <h2 className="text-base font-semibold text-white mb-2">{h}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{p}</p>
          </div>
        ))}
      </section>

      {/* What a license includes */}
      <section className="mb-12 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-sky-500/5 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white mb-4">What a site license includes</h2>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            'Official access for your team, campus, or agency',
            'Privacy and data-handling commitments in writing',
            'A named human for support and onboarding',
            'Accessibility documentation for your review process',
            'Priority on the features your people request',
            'Simple per-seat pricing shaped with the first partners',
          ].map((f) => (
            <li key={f} className="flex gap-2 text-sm text-gray-300">
              <span className="text-emerald-400 shrink-0">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={CONTACT}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors"
          >
            Start the conversation
          </a>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Back to pricing
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Early partners shape the pricing. If you run disability services, IT, or HR and this
          looks like something your people need, the first conversation costs nothing and
          commits you to nothing.
        </p>
      </section>

      {/* The quiet pitch */}
      <section className="rounded-xl border border-gray-800 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white mb-3">Why this exists</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          It was built by someone who spent a lifetime being misread, for everyone who knows
          that feeling. Every design decision follows from that: individuals never pay, nothing
          happens silently, and the tool works with whatever AI your people already use rather
          than locking them into ours. Organizations that license it are not buying software so
          much as making a statement their people can feel: <em>we want to understand you.</em>
        </p>
      </section>
    </div>
  );
}
