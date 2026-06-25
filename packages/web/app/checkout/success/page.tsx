import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Payment successful' };

type CheckoutSuccessPageProps = {
  searchParams?: {
    tier?: string;
  };
};

export default function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const tier = searchParams?.tier;
  const isDiagnostic = tier === 'diagnostic';

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-6">✓</div>
      <h1 className="text-2xl font-bold text-white mb-3">
        {isDiagnostic ? 'Diagnostic purchase received.' : "You&apos;re all set."}
      </h1>
      <p className="text-gray-400 mb-8">
        {isDiagnostic
          ? 'Your payment went through. Submit the brief next so I can review the agent you want diagnosed.'
          : 'Your access email is on its way. Check your inbox (and spam folder just in case) — it usually arrives within a minute.'}
      </p>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-left mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          {isDiagnostic ? 'What to do next' : 'Next steps'}
        </h2>
        {isDiagnostic ? (
          <ol className="space-y-2 text-sm text-gray-400">
            <li>1. Submit your diagnostic brief at <Link href="/diagnostic" className="text-sky-300 hover:text-sky-200">/diagnostic</Link></li>
            <li>2. Include one agent or workflow, not a whole platform</li>
            <li>3. Add the failure mode you want caught before customers do</li>
            <li>4. I’ll use that brief to prepare the report</li>
          </ol>
        ) : (
          <ol className="space-y-2 text-sm text-gray-400">
            <li>1. Find the email from noreply@rpcs1.dev</li>
            <li>2. <code className="text-sky-300">pip install rpcs1</code></li>
            <li>3. Set <code className="text-sky-300">RPCS1_LICENSE_KEY=&lt;your-key&gt;</code></li>
            <li>4. Call <code className="text-sky-300">recommend_params()</code> with no daily limit</li>
            <li>5. Submit your diagnostic brief at <Link href="/diagnostic" className="text-sky-300 hover:text-sky-200">/diagnostic</Link></li>
          </ol>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isDiagnostic ? (
          <Link href="/diagnostic" className="text-sm text-sky-400 hover:text-sky-300">
            Submit diagnostic brief →
          </Link>
        ) : (
          <Link href="/docs/getting-started" className="text-sm text-sky-400 hover:text-sky-300">
            Read the getting started guide →
          </Link>
        )}
        <Link href="/diagnostic" className="text-sm text-sky-400 hover:text-sky-300">
          Submit diagnostic brief →
        </Link>
        <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-300">
          Back to pricing
        </Link>
      </div>
    </div>
  );
}
