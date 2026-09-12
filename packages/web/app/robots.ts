import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { buildRobots, originFromHost } from '@/lib/site';

// One deployment serves rpcs1.dev and www.explicitformula.com. Reading the
// request host lets each host advertise ITS OWN sitemap instead of a fixed
// one (headers() is a request-time API, so this route is dynamic — intended).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  return buildRobots(originFromHost(h.get('x-forwarded-host') ?? h.get('host')));
}
