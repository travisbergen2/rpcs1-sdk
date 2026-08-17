import Link from 'next/link';
import { ProfilePill } from '@/components/ProfilePill';
import { StickerLogo } from '@/components/StickerLogo';
import { BRAND_NAME } from '@/lib/brand';

/**
 * One product fronts the site: the box on the landing page, under the
 * consumer brand (lib/brand.ts). Every station that used to compete in the
 * nav — SendRight, the Tuner, Calibrate, the Translator, R&D — now lives in
 * /labs. Their routes stay live for links and search engines. The mechanism
 * brand (RPCS-1) appears in the footer as "Powered by", per the house rule:
 * outcome on the wrapper, mechanism one click deep.
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0a0f1a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <StickerLogo size="nav" />
          <span className="hidden text-sm font-bold tracking-tight text-white sm:block">
            {BRAND_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <ProfilePill />
          <Link
            href="/labs"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
          >
            Labs
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="hidden rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100 sm:block"
          >
            Docs
          </Link>
          <Link
            href="/diagnostic"
            className="ml-2 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400"
          >
            Agent diagnostic →
          </Link>
        </nav>
      </div>
    </header>
  );
}
