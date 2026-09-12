import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { buildSitemap, originFromHost } from '@/lib/site';

// Same host rule as robots.ts: the sitemap lists the URLs of the host that
// asked for it. The route table itself lives in lib/site.ts (tested there).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  return buildSitemap(originFromHost(h.get('x-forwarded-host') ?? h.get('host')));
}
