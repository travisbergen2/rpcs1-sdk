/**
 * Client-side external stores for the loop's accessibility prefs and the
 * coarse-pointer media query — the house useSyncExternalStore pattern
 * (see components/ProfileProvider.tsx: "localStorage as an external store,
 * SSR-safe, no set-state-in-effect").
 *
 * Snapshots return STABLE references (cached by raw string) so React's
 * snapshot comparison doesn't loop.
 */

import { DEFAULT_PREFS, loadPrefs, PREFS_KEY, savePrefs, type LoopPrefs } from './loop-prefs';

const EVT = 'ef-loop-prefs-changed';

let cachedRaw: string | null | undefined;
let cachedPrefs: LoopPrefs = DEFAULT_PREFS;

export function getPrefsSnapshot(): LoopPrefs {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFS;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFS_KEY);
  } catch {
    return DEFAULT_PREFS;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPrefs = loadPrefs(localStorage);
  }
  return cachedPrefs;
}

export const getPrefsServerSnapshot = (): LoopPrefs => DEFAULT_PREFS;

export function subscribePrefs(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb); // cross-tab sync for free
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function updateLoopPrefs(next: LoopPrefs): void {
  savePrefs(typeof localStorage === 'undefined' ? null : localStorage, next);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT));
}

// ── coarse pointer (dictation hint + tap ergonomics) ──

export function subscribeCoarse(cb: () => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {};
  const mq = matchMedia('(pointer: coarse)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export const getCoarseSnapshot = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export const getCoarseServerSnapshot = (): boolean => false;
