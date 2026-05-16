import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Payment successful' };

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-6">✓</div>
      <h1 className="text-2xl font-bold text-white mb-3">You&apos;re all set.</h1>
      <p className="text-gray-400 mb-8">
        Your license key is on its way to your email. Check your inbox (and spam folder just in case)
        — it usually arrives within a minute.
      </p>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-left mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Next steps</h2>
        <ol className="space-y-2 text-sm text-gray-400">
          <li>1. Find the license key email from noreply@rpcs1.dev</li>
          <li>2. <code className="text-sky-300">pip install rpcs1</code></li>
          <li>3. Set <code className="text-sky-300">RPCS1_LICENSE_KEY=&lt;your-key&gt;</code></li>
          <li>4. Call <code className="text-sky-300">recommend_params()</code> with no daily limit</li>
        </ol>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/docs/getting-started" className="text-sm text-sky-400 hover:text-sky-300">
          Read the getting started guide →
        </Link>
        <Link href="/tuner" className="text-sm text-gray-500 hover:text-gray-300">
          Back to tuner
        </Link>
      </div>
    </div>
  );
}
