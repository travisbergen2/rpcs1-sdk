import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { ProfileProvider } from '@/components/ProfileProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// Domain follows the deployment: set NEXT_PUBLIC_APP_URL when the consumer
// domain goes live; rpcs1.dev remains the fallback and the mechanism home.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rpcs1.dev';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE.replace(/\.$/, '').toLowerCase()}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description:
    'Everything you write can be read more than one way. Paste what you’re about to send, see the readings it forks into, pick the one you meant — and send the version that lands. Free, no account; the check runs in your browser.',
  keywords: ['communication', 'ambiguity', 'prompt clarity', 'misread', 'AI prompts', 'receiver primitives', 'MCP', 'rpcs1', 'agent tuning'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: BRAND_NAME,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.className}`}>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ProfileProvider>
          <Nav />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </ProfileProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
