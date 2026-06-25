import Link from 'next/link';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/docs',                   label: 'Overview' },
  { href: '/docs/getting-started',   label: 'Getting started' },
  { href: '/docs/mcp',               label: 'MCP integration' },
  { href: '/docs/examples',          label: 'Examples' },
  { href: '/imm',                    label: 'IMM primer' },
  { href: '/docs/primitives',        label: 'The five primitives' },
  { href: '/docs/matching',          label: 'Matching principle' },
  { href: '/docs/regimes',           label: 'Stability regimes' },
  { href: '/docs/platforms',         label: 'Platform mappings' },
  { href: '/docs/translation-layer', label: 'Translation layer' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-20">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Documentation</p>
            <nav className="space-y-1">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'block px-3 py-1.5 text-sm rounded-lg transition-colors',
                    'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 prose prose-invert prose-sm max-w-none
          prose-headings:font-bold prose-headings:text-white
          prose-p:text-gray-400 prose-p:leading-relaxed
          prose-code:text-sky-300 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800
          prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-200
          prose-li:text-gray-400">
          {children}
        </div>
      </div>
    </div>
  );
}
