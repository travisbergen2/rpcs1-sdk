/**
 * Site identity for the web package: which origin is canonical, and the public
 * route table that robots.txt, the sitemap and the per-page canonical links all
 * read from.
 *
 * One deployment serves two hosts — rpcs1.dev (the mechanism home) and
 * explicitformula.com (the consumer domain, whose apex the edge 308s to www).
 * `NEXT_PUBLIC_APP_URL` names the canonical origin; `canonicalOrigin` folds it
 * onto the host the edge actually serves, so canonical links and og:url never
 * name an address that redirects. robots.txt and the sitemap, by contrast,
 * describe whichever host was asked (`originFromHost`), so each host
 * advertises its own sitemap and lists its own URLs.
 */

/** Apex hosts the edge redirects to their www form. Extend when a domain is added. */
const WWW_HOSTS: ReadonlySet<string> = new Set(['explicitformula.com']);

const isLocalHost = (host: string) => host === 'localhost' || host === '127.0.0.1';

/**
 * Normalize an origin: https, hostname only (no path, query or trailing
 * slash), apex → www where the edge redirects. Local development keeps http
 * and its port.
 */
export function canonicalOrigin(input: string): string {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  const local = isLocalHost(host);
  const hostname = WWW_HOSTS.has(host) ? `www.${host}` : host;
  const port = local && url.port ? `:${url.port}` : '';
  return `${local ? 'http' : 'https'}://${hostname}${port}`;
}

/** The canonical origin of this deployment (metadataBase, og:url, JSON-LD @ids). */
export const SITE_URL: string = canonicalOrigin(process.env.NEXT_PUBLIC_APP_URL || 'https://rpcs1.dev');

/**
 * Origin for a request, from its Host / X-Forwarded-Host header. Falls back to
 * SITE_URL when the header is missing or unusable.
 */
export function originFromHost(host: string | null | undefined): string {
  const bare = (host ?? '').split(',')[0].trim();
  if (!bare) return SITE_URL;
  const local = bare.startsWith('localhost') || bare.startsWith('127.0.0.1');
  try {
    return canonicalOrigin(`${local ? 'http' : 'https'}://${bare}`);
  } catch {
    return SITE_URL;
  }
}

/** Public routes, in sitemap order, with their sitemap priority. */
export const SITE_ROUTES: ReadonlyArray<readonly [path: string, priority: number]> = [
  ['/', 1.0],
  ['/send', 0.9],
  ['/tuner', 0.9],
  ['/bridge', 0.9],
  ['/connect', 0.8],
  ['/translator', 0.8],
  ['/calibrate', 0.8],
  ['/pricing', 0.8],
  ['/imm', 0.7],
  ['/diagnostic', 0.7],
  ['/docs', 0.7],
  ['/mismatch', 0.5],
  ['/privacy', 0.2],
  ['/terms', 0.2],
];

/** Paths crawlers must not index: the API, the OAuth handshake, checkout. */
export const DISALLOWED_PATHS: readonly string[] = ['/api/', '/oauth/', '/checkout/'];

/** robots.txt for the asked host: same rules everywhere, that host's own sitemap. */
export function buildRobots(origin: string) {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...DISALLOWED_PATHS],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

/** Sitemap entries for the asked host — every public route, once. */
export function buildSitemap(origin: string, lastModified: Date = new Date()) {
  return SITE_ROUTES.map(([path, priority]) => ({
    url: `${origin}${path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
