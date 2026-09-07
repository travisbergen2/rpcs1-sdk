'use client';

/**
 * The transcript as an external store over localStorage — same pattern as
 * lib/rhat-store.ts (useSyncExternalStore: the server renders an empty
 * transcript and the client re-renders once with the stored one).
 *
 * Streaming deltas update the in-memory state only; callers persist on stable
 * transitions (reading awaiting, Go, reply done, error, correction, clear) so
 * localStorage is not rewritten on every token. Cross-tab `storage` events are
 * deliberately NOT mirrored: a second tab must not clobber a stream in flight.
 */

import { useSyncExternalStore } from 'react';
import {
  EMPTY_TRANSCRIPT,
  TRANSCRIPT_STORAGE_KEY,
  parseTranscript,
  serializeTranscript,
  type TranscriptState,
} from '@/lib/transcript';

const listeners = new Set<() => void>();
/** null = not loaded from storage yet (first client read loads it). */
let state: TranscriptState | null = null;

function load(): TranscriptState {
  try {
    return parseTranscript(window.localStorage.getItem(TRANSCRIPT_STORAGE_KEY)) ?? EMPTY_TRANSCRIPT;
  } catch {
    return EMPTY_TRANSCRIPT;
  }
}

function getSnapshot(): TranscriptState {
  if (state === null) state = load();
  return state;
}

function getServerSnapshot(): TranscriptState {
  return EMPTY_TRANSCRIPT;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function notify(): void {
  for (const l of listeners) l();
}

/** Current state, outside React (for reading context/samples at call time). */
export function readTranscript(): TranscriptState {
  return getSnapshot();
}

/** Apply a pure update; persist to localStorage when asked. */
export function updateTranscript(
  fn: (s: TranscriptState) => TranscriptState,
  opts: { persist?: boolean } = {},
): void {
  state = fn(getSnapshot());
  if (opts.persist) {
    try {
      window.localStorage.setItem(TRANSCRIPT_STORAGE_KEY, serializeTranscript(state));
    } catch {
      /* storage denied — the in-memory transcript still drives this tab */
    }
  }
  notify();
}

/** Forget the conversation: memory and storage. */
export function clearTranscript(): void {
  state = EMPTY_TRANSCRIPT;
  try {
    window.localStorage.removeItem(TRANSCRIPT_STORAGE_KEY);
  } catch {
    /* nothing to remove, or storage denied */
  }
  notify();
}

export function useTranscript(): TranscriptState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
