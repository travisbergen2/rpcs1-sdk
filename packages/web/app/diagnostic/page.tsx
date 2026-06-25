import type { Metadata } from 'next';
import Link from 'next/link';
import { DiagnosticIntakeForm } from '@/components/DiagnosticIntakeForm';

export const metadata: Metadata = {
  title: 'Diagnostic Brief',
  description: 'Submit the agent details needed for an RPCS-1 paid diagnostic report.',
};

export default function DiagnosticPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-start">
        <section>
          <p className="text-xs font-mono text-sky-400 mb-3">paid diagnostic intake</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Submit the agent you want diagnosed.
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mb-8">
            Use this brief whether you&apos;ve already paid or you want to request the diagnostic
            first. I use the details to produce a failure-risk score, recommended runtime posture,
            and implementation priorities for the workload you actually ship.
          </p>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 sm:p-8 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">What helps most</h2>
            <ul className="space-y-3 text-sm text-gray-400 leading-relaxed">
              <li>• One specific agent or workflow, not a whole platform</li>
              <li>• The main failure mode you want caught before customers see it</li>
              <li>• The deployment stage: pre-purchase, post-purchase, or internal review</li>
              <li>• Any context about volume, stakes, policy pressure, or handoff behavior</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 sm:p-8">
            <p className="text-xs font-mono text-sky-400 mb-2">what you get</p>
            <p className="text-gray-300 leading-relaxed">
              A concise diagnostic report you can hand to your team, plus a clearer decision on
              whether the agent should be more cautious, more grounded, or less eager to commit.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
              >
                Buy the diagnostic
              </Link>
              <Link
                href="/pricing#diagnostic"
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
              >
                Review pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-950/80 p-6 sm:p-8 shadow-2xl shadow-black/20">
          <DiagnosticIntakeForm />
        </section>
      </div>
    </div>
  );
}
