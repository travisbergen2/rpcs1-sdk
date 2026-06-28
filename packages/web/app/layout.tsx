import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: {
    default: 'RPCS-1 - five-primitive agent battery',
    template: '%s | RPCS-1',
  },
  description:
    'Measure TI, SG, FT, UE, and AR in a configured agent, then get the runtime settings and next test.',
  keywords: ['AI evaluation', 'agent observability', 'agent battery', 'receiver primitives', 'MCP', 'rpcs1', 'IMM'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rpcs1.dev',
    siteName: 'RPCS-1',
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
