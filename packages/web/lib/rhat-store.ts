'use client';

/**
 * R̂ store — the five dials as an external store over localStorage.
 *
 * Same pattern as components/ProfileProvider.tsx (useSyncExternalStore, so
 * the server renders the neutral profile and the client re-renders once with
 * the stored one — no set-state-in-effect). Reads and writes the key
 * /calibrate writes and the Bridge return leg reads (RHAT_STORAGE_KEY), so a
 * calibration and a slider move are the same object.
 *
 * Snapshot identity is stable while the stored string is unchanged —
 * useSyncExternalStore requires that or it re-renders forever.
 */

import { useSyncExternalStore } from 'react';
import type { ReceiverProfile } from '@rpcs1/core';
import {
  NEUTRAL_PROFILE,
  RHAT_STORAGE_KEY,
  parseStoredProfile,
  serializeProfile,
} from '@/lib/instrument';

const listeners = new Set<() => void>();

/** Most recent write in this tab — wins over storage so a denied setItem still moves the slider. */
let memory: string | null = null;
let cached: { raw: string | null; profile: ReceiverProfile } | null = null;

function readRaw(): string | null {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(RHAT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ReceiverProfile {
  const raw = readRaw();
  if (cached && cached.raw === raw) return cached.profile;
  const profile = parseStoredProfile(raw) ?? NEUTRAL_PROFILE;
  cached = { raw, profile };
  return profile;
}

function getServerSnapshot(): ReceiverProfile {
  return NEUTRAL_PROFILE;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export function writeRhat(p: ReceiverProfile): void {
  const raw = serializeProfile(p);
  memory = raw;
  try {
    window.localStorage.setItem(RHAT_STORAGE_KEY, raw);
  } catch {
    /* storage denied — the in-memory copy still drives this tab */
  }
  for (const l of listeners) l();
}

export function useRhat(): [ReceiverProfile, (p: ReceiverProfile) => void] {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [profile, writeRhat];
}
