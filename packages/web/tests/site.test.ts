import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import {
  DISALLOWED_PATHS,
  SITE_ROUTES,
  SITE_URL,
  buildRobots,
  buildSitemap,
  canonicalOrigin,
} from '../lib/site';
import { SITE_URL as STRUCTURED_DATA_SITE_URL } from '../lib/structured-data';

const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** The file that declares a route's metadata: its page, else its layout. */
function metadataFile(path: string): string {
  const seg = path.replace(/^\//, '');
  const candidates = seg ? [`app/${seg}/page.tsx`, `app/${seg}/layout.tsx`] : ['app/page.tsx', 'app/layout.tsx'];
  for (const c of candidates) {
    if (existsSync(join(ROOT, c)) && read(c).includes('export const metadata')) return c;
  }
  throw new Error(`no metadata export for ${path}`);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (rel.endsWith('.tsx') || rel.endsWith('.ts')) out.push(rel);
  }
  return out;
}

describe('canonicalOrigin', () => {
  it('folds the explicitformula.com apex onto www — the host the edge actually serves', () => {
    expect(canonicalOrigin('https://explicitformula.com')).toBe('https://www.explicitformula.com');
    expect(canonicalOrigin('https://explicitformula.com/')).toBe('https://www.explicitformula.com');
    expect(canonicalOrigin('http://EXPLICITFORMULA.com/tuner?preset=support')).toBe('https://www.explicitformula.com');
  });

  it('leaves www and rpcs1.dev alone, on https, without paths or trailing slashes', () => {
    expect(canonicalOrigin('https://www.explicitformula.com/')).toBe('https://www.explicitformula.com');
    expect(canonicalOrigin('https://rpcs1.dev')).toBe('https://rpcs1.dev');
    expect(canonicalOrigin('https://rpcs1.dev/docs/mcp/')).toBe('https://rpcs1.dev');
  });

  it('keeps local development on http with its port', () => {
    expect(canonicalOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(canonicalOrigin('http://127.0.0.1:3000/')).toBe('http://127.0.0.1:3000');
  });

  it('SITE_URL is already canonical and is the same value the structured-data module re-exports', () => {
    expect(SITE_URL).toBe(canonicalOrigin(SITE_URL));
    expect(SITE_URL).toMatch(/^https?:\/\/[^/]+$/);
    expect(STRUCTURED_DATA_SITE_URL).toBe(SITE_URL);
  });
});

describe('robots.txt and sitemap builders', () => {
  it('robots names the sitemap on the given origin and keeps the disallow list', () => {
    for (const origin of ['https://rpcs1.dev', 'https://www.explicitformula.com']) {
      const r = buildRobots(origin);
      expect(r.sitemap).toBe(`${origin}/sitemap.xml`);
      expect(r.rules.userAgent).toBe('*');
      expect(r.rules.allow).toBe('/');
      expect(r.rules.disallow).toEqual([...DISALLOWED_PATHS]);
    }
    expect(DISALLOWED_PATHS).toEqual(['/api/', '/oauth/', '/checkout/']);
  });

  it('sitemap lists every public route on the given origin, once, with priorities in (0, 1]', () => {
    const when = new Date('2026-09-12T00:00:00Z');
    const entries = buildSitemap('https://www.explicitformula.com', when);
    expect(entries).toHaveLength(SITE_ROUTES.length);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
    for (const e of entries) {
      expect(e.url.startsWith('https://www.explicitformula.com/')).toBe(true);
      expect(e.priority).toBeGreaterThan(0);
      expect(e.priority).toBeLessThanOrEqual(1);
      expect(e.lastModified).toBe(when);
      expect(e.changeFrequency).toBe('weekly');
    }
    expect(entries[0].url).toBe('https://www.explicitformula.com/');
  });

  it('every sitemap route is a real page', () => {
    for (const [path] of SITE_ROUTES) {
      const seg = path.replace(/^\//, '');
      const page = seg ? `app/${seg}/page.tsx` : 'app/page.tsx';
      expect(existsSync(join(ROOT, page)), `${path} → ${page}`).toBe(true);
    }
  });
});

describe('the served routes (app/robots.ts, app/sitemap.ts)', () => {
  it('robots.txt is static, synchronous, and names the canonical origin’s sitemap on every host', () => {
    const r = robots();
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(r.rules).toEqual(buildRobots(SITE_URL).rules);
  });

  it('the sitemap is static, synchronous, and lists canonical URLs only', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toHaveLength(SITE_ROUTES.length);
    for (const u of urls) expect(u.startsWith(`${SITE_URL}/`), u).toBe(true);
    expect(urls).toContain(`${SITE_URL}/connect`);
  });

  it('neither route hardcodes a host or reads request headers — both build from SITE_URL through lib/site', () => {
    for (const file of ['app/robots.ts', 'app/sitemap.ts']) {
      const src = read(file);
      expect(src, file).toMatch(/from '@\/lib\/site'/);
      expect(src, file).toMatch(/SITE_URL/);
      expect(src, file).not.toMatch(/https?:\/\//);
      expect(src, file).not.toMatch(/next\/headers/);
    }
  });
});

describe('canonical links (source guards)', () => {
  it('every public route declares a relative canonical equal to its own path', () => {
    for (const [path] of SITE_ROUTES) {
      const file = metadataFile(path);
      expect(read(file), `${path} in ${file}`).toMatch(new RegExp(`canonical:\\s*'${path.replace(/\//g, '\\/')}'`));
    }
  });

  it('no page hardcodes a host in a canonical — metadataBase supplies the origin', () => {
    for (const file of walk('app')) {
      expect(read(file), file).not.toMatch(/canonical:\s*'https?:\/\//);
    }
  });

  it('the root layout takes metadataBase and og:url from SITE_URL and declares no canonical of its own', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/metadataBase: new URL\(SITE_URL\)/);
    expect(layout).toMatch(/url: SITE_URL/);
    // A canonical in the root layout would declare every page's canonical as "/".
    expect(layout).not.toMatch(/canonical/);
  });
});
