import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import nextConfig from '../next.config.mjs';

/**
 * Redirect table — every entry must point at a route that actually exists,
 * so a redirect can never turn one 404 into another.
 */
describe('redirects (next.config.mjs)', () => {
  it('/research permanently redirects to /rd (the research page; /research was a 404)', async () => {
    const list = await nextConfig.redirects!();
    const r = list.find((x) => x.source === '/research');
    expect(r).toBeDefined();
    expect(r!.destination).toBe('/rd');
    expect(r!.permanent).toBe(true);
  });

  it('every internal redirect destination is a real app route', async () => {
    const list = await nextConfig.redirects!();
    expect(list.length).toBeGreaterThan(0);
    for (const r of list) {
      if (!r.destination.startsWith('/')) continue;
      const seg = r.destination.replace(/^\//, '').split(/[?#]/)[0];
      const page = join(__dirname, '..', 'app', seg, 'page.tsx');
      expect(existsSync(page), `${r.source} -> ${r.destination} (${page})`).toBe(true);
    }
  });

  it('no redirect source is itself a real route (a redirect must never shadow a page)', async () => {
    const list = await nextConfig.redirects!();
    for (const r of list) {
      const seg = r.source.replace(/^\//, '');
      expect(existsSync(join(__dirname, '..', 'app', seg, 'page.tsx')), r.source).toBe(false);
    }
  });
});
