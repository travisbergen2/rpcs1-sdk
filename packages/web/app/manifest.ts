import type { MetadataRoute } from 'next';
import { BRAND_NAME } from '@/lib/brand';

/**
 * PWA manifest (M2 — Mobile Arc Build Spec). Served at /manifest.webmanifest
 * and auto-linked by the App Router. start_url is /loop: the capture surface
 * IS the app for installed users; the vault-native mobile surface is the
 * Obsidian plugin (two-surface architecture).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description:
      'Say it once. Make sure it landed. Brain-dump what you want, see what the AI heard, lock the lines that are right.',
    start_url: '/loop',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icons/ef-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/ef-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/ef-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
