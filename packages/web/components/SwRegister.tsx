'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (M2 — installability + offline shell).
 * Production only: a dev SW caches stale dev-server chunks and causes
 * confusing hot-reload behavior. Registration failure is silent by design —
 * the site works identically without it.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no SW = no offline shell; everything else unaffected */
    });
  }, []);
  return null;
}
