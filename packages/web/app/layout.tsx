import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: {
    default: 'RPCS-1 Agent Tuner - Optimize deployed AI agents',
    template: '%s | RPCS-1 Agent Tuner',
  },
  description:
    'A configuration framework for AI agents grounded in RPCS-1 receiver dynamics. ' +
    'Translate environmental entropy, stakes, and predictability into specific LLM parameters.',
  keywords: ['ai agents', 'llm configuration', 'agent tuning', 'temperature', 'context window', 'rpcs1'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rpcs1.dev',
    siteName: 'RPCS-1 Agent Tuner',
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
