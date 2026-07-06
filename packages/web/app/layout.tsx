import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'RPCS-1 — agent settings, derived not guessed',
    template: '%s | RPCS-1',
  },
  description:
    'Turn your agent’s operating conditions into the runtime settings it needs — using receiver laws derived in the IMM research program. Five-primitive profile, failure-risk read, next test.',
  keywords: ['AI evaluation', 'agent observability', 'agent tuning', 'receiver primitives', 'IMM', 'MCP', 'rpcs1', 'agent configuration'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rpcs1.dev',
    siteName: 'RPCS-1',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.className}`}>
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
