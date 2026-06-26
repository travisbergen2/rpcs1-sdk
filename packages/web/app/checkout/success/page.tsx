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
          ? 'Your payment went through. You bought a written decision memo for one agent, and the next step is the brief, not another checkout.'
          : 'Your access email is on its way. Check your inbox (and spam folder just in case).'}
      </p>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-left mb-8">
        {isDiagnostic ? (
          <ol className="space-y-2 text-sm text-gray-400">
            <li>1. Open the brief at <Link href="/diagnostic" className="text-sky-300 hover:text-sky-200">/diagnostic</Link></li>
            <li>2. Include one agent or workflow</li>
            <li>3. Add the failure mode you want caught</li>
          </ol>
        ) : (
          <ol className="space-y-2 text-sm text-gray-400">
            <li>1. Find the email from noreply@rpcs1.dev</li>
            <li>2. <code className="text-sky-300">pip install rpcs1</code></li>
            <li>3. Set <code className="text-sky-300">RPCS1_LICENSE_KEY=&lt;your-key&gt;</code></li>
            <li>4. Call <code className="text-sky-300">recommend_params()</code></li>
          </ol>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/diagnostic"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          Start the brief now →
        </Link>
        <Link
          href={isDiagnostic ? '/pricing#diagnostic' : '/docs/getting-started'}
          className="text-sm text-sky-400 hover:text-sky-300 self-center"
        >
          {isDiagnostic ? 'View pricing' : 'Read the getting started guide →'}
        </Link>
      </div>
    </div>
  );
}
