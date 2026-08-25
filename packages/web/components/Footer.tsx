import Link from 'next/link';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-gray-800 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {BRAND_NAME} — {BRAND_TAGLINE.replace(/\.$/, '').toLowerCase()}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Free for people — no account, no ads, and the check runs in
              your browser. Licensed for organizations.
            </p>
            <p className="mt-3 text-xs text-gray-500">
              Powered by{' '}
              <a
                href="https://rpcs1.dev"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-gray-400 underline-offset-4 hover:text-gray-200 hover:underline"
              >
                rpcs1.dev
              </a>{' '}
              — the receiver engine, its laws, and its scorecard.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/#box"
                className="text-sm font-medium text-gray-300 underline-offset-4 hover:text-white hover:underline"
              >
                Try the box →
              </Link>
              <Link
                href="/diagnostic"
                className="text-sm font-medium text-amber-300/90 underline-offset-4 hover:text-amber-200 hover:underline"
              >
                Founding pilot →
              </Link>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link href="/labs" className="transition-colors hover:text-gray-300">Labs</Link>
            <Link href="/pricing" className="transition-colors hover:text-gray-300">Pricing</Link>
            <Link href="/institutions" className="transition-colors hover:text-gray-300">Organizations</Link>
            <Link href="/docs" className="transition-colors hover:text-gray-300">Docs</Link>
            <Link href="/rd" className="transition-colors hover:text-gray-300">R&amp;D</Link>
            <Link href="/docs/mcp" className="transition-colors hover:text-gray-300">MCP</Link>
            <Link href="/privacy" className="transition-colors hover:text-gray-300">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-gray-300">Terms</Link>
            <a
              href="https://github.com/travisbergen2/rpcs1-sdk"
              className="transition-colors hover:text-gray-300"
              target="_blank" rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
        <p className="mt-8 text-xs text-gray-700">
          © {new Date().getFullYear()} Travis Bergen. MIT License.
        </p>
      </div>
    </footer>
  );
}
