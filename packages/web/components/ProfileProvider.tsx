'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { track } from '@vercel/analytics';
import type { ProfileKey } from '@/lib/profiles';

const STORAGE_KEY = 'rpcs1-profile';
const VALID: readonly ProfileKey[] = ['technical', 'executive', 'plain', 'literal'];
const DEFAULT_PROFILE: ProfileKey = 'technical';

// ── localStorage as an external store (SSR-safe, no set-state-in-effect) ──
// useSyncExternalStore hydrates with the server snapshot, then re-renders
// once with the client snapshot after hydration — the sanctioned version of
// the "restore persisted preference" pattern.

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Cross-tab sync comes for free via the storage event.
  window.addEventListener('storage', onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getSnapshot(): ProfileKey {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (VALID as readonly string[]).includes(saved)) return saved as ProfileKey;
  } catch {
    /* storage unavailable — fall through to default */
  }
  return DEFAULT_PROFILE;
}

function getServerSnapshot(): ProfileKey {
  return DEFAULT_PROFILE;
}

function writeProfile(p: ProfileKey) {
  try {
    window.localStorage.setItem(STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

interface ProfileCtx {
  profile: ProfileKey;
  setProfile: (p: ProfileKey) => void;
}

const Ctx = createContext<ProfileCtx>({ profile: DEFAULT_PROFILE, setProfile: () => {} });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setProfile = useCallback((p: ProfileKey) => {
    writeProfile(p);
    try {
      track('profile_selected', { profile: p });
    } catch {
      /* analytics unavailable — ignore */
    }
  }, []);

  return <Ctx.Provider value={{ profile, setProfile }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  return useContext(Ctx);
}
