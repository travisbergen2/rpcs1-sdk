import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-24 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              RPCS<span className="text-sky-400">-1</span> — agent settings, derived not guessed
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Free sample, written memo, and MCP access for deployed AI agents.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/tuner"
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
              >
                Run free sample
              </Link>
              <Link
                href="/api/checkout?tier=diagnostic"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 shadow-lg shadow-amber-500/20"
              >
                $99 founding pilot
              </Link>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
            <Link href="/docs" className="hover:text-gray-300 transition-colors">Docs</Link>
            <Link href="/rd" className="hover:text-gray-300 transition-colors">R&amp;D</Link>
            <Link href="/docs/examples" className="hover:text-gray-300 transition-colors">Examples</Link>
            <Link href="/docs/mcp" className="hover:text-gray-300 transition-colors">MCP</Link>
            <Link href="/diagnostic" className="hover:text-gray-300 transition-colors">Brief</Link>
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <a
              href="https://github.com/travisbergen2/rpcs1-sdk"
              className="hover:text-gray-300 transition-colors"
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
