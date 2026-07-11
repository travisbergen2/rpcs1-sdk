import type { MetadataRoute } from 'next';

const BASE = 'https://rpcs1.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes: Array<[path: string, priority: number]> = [
    ['/', 1.0],
    ['/tuner', 0.9],
    ['/bridge', 0.9],
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
  return routes.map(([path, priority]) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
