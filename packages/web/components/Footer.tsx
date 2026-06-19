import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-24 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white">
              RPCS<span className="text-sky-400">-1</span> Agent Tuner
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Operationalized from receiver dynamics for AI agent pre-tuning.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link href="/tuner"   className="hover:text-gray-300 transition-colors">Tuner</Link>
            <Link href="/docs"    className="hover:text-gray-300 transition-colors">Docs</Link>
            <Link href="/imm"     className="hover:text-gray-300 transition-colors">IMM</Link>
            <Link href="/mismatch" className="hover:text-gray-300 transition-colors">Mismatch</Link>
            <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-gray-300 transition-colors">Terms</Link>
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
