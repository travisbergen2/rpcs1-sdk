import Link from 'next/link';
import { ProfilePill } from '@/components/ProfilePill';

export function Nav() {
  return (
    <header className="border-b border-gray-800 bg-[#0a0f1a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg font-bold text-white tracking-tight">
            RPCS<span className="text-sky-400">-1</span>
          </span>
          <span className="text-xs text-gray-500 font-mono hidden sm:block">derived receiver laws</span>
        </Link>

        <nav className="flex items-center gap-1">
          <ProfilePill />
          <Link
            href="/tuner"
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-800"
          >
            Free sample
          </Link>
          <Link
            href="/pricing"
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-800"
          >
            Pricing
          </Link>
          <Link
            href="/translator"
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-800"
          >
            Translator
          </Link>
          <Link
            href="/calibrate"
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-800"
          >
            Calibrate
          </Link>
          <Link
            href="/api/checkout?tier=diagnostic"
            className="ml-2 px-3 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
          >
            Founding pilot →
          </Link>
        </nav>
      </div>
    </header>
  );
}
