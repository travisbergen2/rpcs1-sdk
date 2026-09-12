/**
 * Structured data (JSON-LD) — the machine-readable statement of what this
 * site is, who publishes it, and where its help and terms live.
 *
 * Kept as plain data plus a serializer so tests can check the graph without
 * rendering the layout. The visible pages and this graph read the same
 * constants (brand name, site description, site URL), so the two cannot
 * drift.
 *
 * Nothing here is a claim about results: the graph names the software, its
 * author, its docs and its price page. Evidence stays on /rd, at its grade.
 */
import { BRAND_NAME } from './brand';

/**
 * Canonical origin of the deployment — defined in lib/site.ts (it folds the
 * explicitformula.com apex onto www, the host the edge actually serves) and
 * re-exported here for the graph builders and existing importers.
 */
import { SITE_URL } from './site';
export { SITE_URL };

/** The one-paragraph description shared by <meta name="description"> and the graph. */
export const SITE_DESCRIPTION =
  'Everything you write can be read more than one way. Paste what you’re about to send, see the readings it forks into, pick the one you meant — and send the version that lands. Free, no account; the check runs in your browser.';

export const AUTHOR = {
  name: 'Travis Bergen',
  url: 'https://fractalyouniverse.org',
  sameAs: ['https://github.com/travisbergen2', 'https://orcid.org/0009-0009-3950-8390'],
} as const;

export interface FaqItem {
  /** The question, as a reader would ask it. */
  q: string;
  /** A plain-text answer (no markup) — it is emitted verbatim into the FAQPage schema. */
  a: string;
  /** Optional page that carries the full detail. */
  href?: string;
  /** Link label for `href`. */
  label?: string;
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/**
 * Site-wide graph: the author (a person, not an organization — there is no
 * registered company behind the name), the website, and the software.
 */
export function buildSiteGraph(appUrl: string, description: string = SITE_DESCRIPTION) {
  const base = trimSlash(appUrl);
  const authorId = `${base}/#author`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': authorId,
        name: AUTHOR.name,
        url: AUTHOR.url,
        sameAs: [...AUTHOR.sameAs],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/`,
        name: BRAND_NAME,
        description,
        inLanguage: 'en',
        publisher: { '@id': authorId },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#app`,
        name: BRAND_NAME,
        url: `${base}/`,
        description,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Any (web browser)',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `${base}/pricing`,
        },
        author: { '@id': authorId },
        softwareHelp: { '@type': 'CreativeWork', url: `${base}/docs` },
        termsOfService: `${base}/terms`,
      },
    ],
  };
}

/** FAQPage schema for a list of question/answer pairs rendered on `pagePath`. */
export function buildFaqPage(appUrl: string, pagePath: string, items: readonly FaqItem[]) {
  const base = trimSlash(appUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${base}${pagePath}#questions`,
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

/**
 * Serialize for a <script type="application/ld+json"> body. The three
 * characters that could close the script or start markup are escaped as JSON
 * unicode escapes, which JSON parsers read back unchanged.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
