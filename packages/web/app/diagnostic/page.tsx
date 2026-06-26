import type { Metadata } from 'next';
import Link from 'next/link';
import { DiagnosticIntakeForm } from '@/components/DiagnosticIntakeForm';

export const metadata: Metadata = {
  title: 'Diagnostic Brief',
  description: 'Submit the single agent or workflow details needed for an RPCS-1 paid diagnostic report.',
};

export default function DiagnosticPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-start">
        <section>
          <p className="text-xs font-mono text-sky-400 mb-3">paid diagnostic intake</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Submit one agent or workflow.
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mb-8">
            After checkout, use this brief to capture one workload, one failure mode, and the
            context needed for a written report.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            {[
              { title: '1 workflow', body: 'Focus on the agent people actually ship.' },
              { title: '1 failure mode', body: 'Show the risk you want caught before launch.' },
              { title: '1 written report', body: 'Get the score, posture, and next test.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 sm:p-8 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">What helps most</h2>
            <ul className="space-y-3 text-sm text-gray-400 leading-relaxed">
              <li>• One specific agent or workflow, not a whole platform</li>
              <li>• The main failure mode you want caught before customers see it</li>
              <li>• The deployment stage: pre-purchase, post-purchase, or internal review</li>
              <li>• Any context about volume, stakes, policy pressure, or handoff behavior</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 sm:p-6 mb-8">
            <p className="text-xs font-mono text-sky-400 mb-2">sales tunnel</p>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              The buying path is simple: free tuner first, then the paid report, then this brief.
              If you are already here, you are one step from submitting the diagnostic input.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
              >
                Buy report now
              </Link>
              <Link
                href="/pricing#diagnostic"
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
              >
                Review pricing
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 sm:p-8">
            <p className="text-xs font-mono text-sky-400 mb-2">what you get</p>
            <p className="text-gray-300 leading-relaxed">
              A concise report you can hand to your team, plus a clearer decision on whether the
              agent should be more cautious, more grounded, or less eager to commit.
            </p>
            <div className="mt-4 rounded-lg border border-sky-500/15 bg-gray-950/60 p-4">
              <p className="text-xs font-mono text-sky-400 mb-2">example output</p>
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-gray-300">
                  regime <span className="text-sky-400">stable</span>
                </span>
                <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-gray-300">
                  posture <span className="text-emerald-400">cautious</span>
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                The report tells you what to change, what to test next, and how likely the current
                configuration is to fail under pressure.
              </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
              >
                Buy report, then submit brief
              </Link>
              <Link
                href="/pricing#diagnostic"
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors"
              >
                Review the report
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
