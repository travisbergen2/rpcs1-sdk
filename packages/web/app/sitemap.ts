import type { MetadataRoute } from 'next';
import { SITE_URL, buildSitemap } from '@/lib/site';

// Canonical URLs only (see lib/site.ts for the route table and the origin rule).
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(SITE_URL);
}
