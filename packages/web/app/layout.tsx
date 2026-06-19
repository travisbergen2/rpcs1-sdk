import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: {
    default: 'RPCS-1 - AI quality diagnostics for deployed agents',
    template: '%s | RPCS-1 AI Quality Diagnostics',
  },
  description:
    'Review AI agent configuration risk before launch and after quality regressions. ' +
    'Diagnose consistency, grounding, escalation, and resolution failures.',
  keywords: ['AI quality', 'AI evaluation', 'agent observability', 'customer support AI', 'agent configuration', 'rpcs1', 'IMM'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rpcs1.dev',
    siteName: 'RPCS-1 AI Quality Diagnostics',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
