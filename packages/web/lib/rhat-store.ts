'use client';

/**
 * Profile stores — each board's five faders as an external store over
 * localStorage.
 *
 * Same pattern as components/ProfileProvider.tsx (useSyncExternalStore, so
 * the server renders the neutral profile and the client re-renders once with
 * the stored one — no set-state-in-effect).
 *
 * YOUR board reads and writes the key /calibrate writes and the Bridge return
 * leg reads (RHAT_STORAGE_KEY), so a calibration and a fader move are the same
 * object. THE MODEL'S board has its own key (MODEL_RHAT_STORAGE_KEY).
 *
 * Snapshot identity is stable while the stored string is unchanged —
 * useSyncExternalStore requires that or it re-renders forever.
 */

import { useSyncExternalStore } from 'react';
import type { ReceiverProfile } from '@rpcs1/core';
import {
  MODEL_RHAT_STORAGE_KEY,
  NEUTRAL_PROFILE,
  RHAT_STORAGE_KEY,
  parseStoredProfile,
  serializeProfile,
} from '@/lib/instrument';

interface ProfileStore {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => ReceiverProfile;
  getServerSnapshot: () => ReceiverProfile;
  write: (p: ReceiverProfile) => void;
}

function createProfileStore(storageKey: string): ProfileStore {
  const listeners = new Set<() => void>();
  /** Most recent write in this tab — wins over storage so a denied setItem still moves the fader. */
  let memory: string | null = null;
  let cached: { raw: string | null; profile: ReceiverProfile } | null = null;

  const readRaw = (): string | null => {
    if (memory !== null) return memory;
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  return {
    subscribe(onStoreChange) {
      listeners.add(onStoreChange);
      window.addEventListener('storage', onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener('storage', onStoreChange);
      };
    },
    getSnapshot() {
      const raw = readRaw();
      if (cached && cached.raw === raw) return cached.profile;
      const profile = parseStoredProfile(raw) ?? NEUTRAL_PROFILE;
      cached = { raw, profile };
      return profile;
    },
    getServerSnapshot() {
      return NEUTRAL_PROFILE;
    },
    write(p) {
      const raw = serializeProfile(p);
      memory = raw;
      try {
        window.localStorage.setItem(storageKey, raw);
      } catch {
        /* storage denied — the in-memory copy still drives this tab */
      }
      for (const l of listeners) l();
    },
  };
}

const youStore = createProfileStore(RHAT_STORAGE_KEY);
const modelStore = createProfileStore(MODEL_RHAT_STORAGE_KEY);

export const writeRhat = youStore.write;
export const writeModelRhat = modelStore.write;

/** YOUR board. */
export function useRhat(): [ReceiverProfile, (p: ReceiverProfile) => void] {
  const profile = useSyncExternalStore(youStore.subscribe, youStore.getSnapshot, youStore.getServerSnapshot);
  return [profile, youStore.write];
}

/** THE MODEL'S board. */
export function useModelRhat(): [ReceiverProfile, (p: ReceiverProfile) => void] {
  const profile = useSyncExternalStore(modelStore.subscribe, modelStore.getSnapshot, modelStore.getServerSnapshot);
  return [profile, modelStore.write];
}
