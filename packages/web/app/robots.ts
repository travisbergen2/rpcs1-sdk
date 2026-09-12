import type { MetadataRoute } from 'next';
import { SITE_URL, buildRobots } from '@/lib/site';

// One deployment serves rpcs1.dev and www.explicitformula.com. Both hosts point
// crawlers at the canonical origin's sitemap (sitemaps.org cross-submission);
// the sitemap lists canonical URLs only. Static — no request-time input.
export default function robots(): MetadataRoute.Robots {
  return buildRobots(SITE_URL);
}
