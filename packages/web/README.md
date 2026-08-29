# Explicit Formula — web app (`packages/web`)

Next.js app serving explicitformula.com (and rpcs1.dev, the mechanism home):
the `/loop` capture surface, the translator/tuner APIs, docs, and billing.

## /loop as an installable app (M2 — Mobile Arc Build Spec)

The `/loop` page is the zero-install surface of the two-surface mobile
architecture (the vault-native surface is the Obsidian plugin). M2 adds:

- **Installable:** `app/manifest.ts` (served at `/manifest.webmanifest`),
  icons in `public/icons/`, `start_url: /loop`.
- **Offline shell:** `public/sw.js` — cache-first for hashed build assets,
  network-first navigations with a cached `/loop` fallback. **`/api/*` is
  never cached**: interpretation is always live, answers are never stale.
  Registered by `components/SwRegister.tsx` (production only).
- **Offline capture (`lib/offline-drafts.ts`):** the dump box autosaves a
  rolling draft to IndexedDB while you type (debounced); a send attempted
  offline is preserved as its own draft. On return, "Pick up where you left
  off" restores it. **Nothing auto-sends** — interpretation only runs on the
  user's tap. Store is dependency-free and injectable (unit-tested with an
  in-memory backend).
- **Accessibility settings (`lib/loop-prefs.ts`):** panel-local text size
  (Default/Large/Larger — page-scoped, never fights browser zoom) and
  response pacing (Instant/1s/2s) implemented as a **floor on
  time-to-render, never an addend** — slow networks already count toward it.
  Persisted in localStorage; mirrors `packages/obsidian/src/ui-prefs.ts` so
  both surfaces behave identically.
- **Screen-reader layer:** one persistent polite live region announces round
  completions, held locks, offline saves, and answers (a region remounted
  per stage never announces — this one is mounted once). Focus management on
  stage swaps was already present.
- **Mobile ergonomics:** ≥44px targets on lines and primary actions,
  dictation hint on coarse-pointer devices (the OS keyboard's mic key — no
  speech pipeline shipped).

## Development

```
npm run test --workspace=packages/web   # vitest (incl. loop-prefs, offline-drafts)
npm run lint --workspace=packages/web
npm run build --workspace=packages/web
```

Bump `VERSION` in `public/sw.js` when changing the service worker.
