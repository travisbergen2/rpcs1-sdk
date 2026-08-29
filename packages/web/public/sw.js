/* Explicit Formula service worker (M2).
 *
 * Deliberately minimal and safe:
 *  - NEVER touches /api/* — AI responses are never cached, interpretation is
 *    always live (matches the privacy posture: no silent stale answers).
 *  - Static assets (hashed /_next/static, icons): cache-first (immutable).
 *  - Navigations: network-first with a cached-shell fallback, so the capture
 *    surface (/loop) opens offline and the offline draft queue can do its job.
 * Bump VERSION to invalidate all caches on deploy of a new SW.
 */
const VERSION = 'ef-sw-v1';
const SHELL = ['/', '/loop'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return; // POSTs (incl. /api) pass through untouched
  if (url.pathname.startsWith('/api/')) return; // never cache API traffic

  // Immutable build assets + our icons: cache-first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations: network-first, fall back to the cached shell offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok && SHELL.includes(url.pathname)) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(VERSION);
          return (
            (await cache.match(event.request)) ||
            (await cache.match('/loop')) ||
            (await cache.match('/')) ||
            Response.error()
          );
        }),
    );
  }
});
