import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { ProfileProvider } from '@/components/ProfileProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SwRegister } from '@/components/SwRegister';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { SITE_DESCRIPTION, SITE_URL, buildSiteGraph, serializeJsonLd } from '@/lib/structured-data';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// Domain follows the deployment: SITE_URL is NEXT_PUBLIC_APP_URL when the
// consumer domain is live; rpcs1.dev remains the fallback and the mechanism home.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE.replace(/\.$/, '').toLowerCase()}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['communication', 'ambiguity', 'prompt clarity', 'misread', 'AI prompts', 'receiver primitives', 'MCP', 'rpcs1', 'agent tuning'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: BRAND_NAME,
  },
};

// Site-wide structured data (JSON-LD): who publishes this, what the software
// is, where its docs, terms and price page live. Built from the same
// constants as the visible copy; see lib/structured-data.ts.
const SITE_GRAPH = serializeJsonLd(buildSiteGraph(SITE_URL));

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
        <SwRegister />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_GRAPH }} />
      </body>
    </html>
  );
}
