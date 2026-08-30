/**
 * Loop accessibility preferences (M2) — pure, unit-testable.
 *
 * Mirror of packages/obsidian/src/ui-prefs.ts (M1): same semantics, same
 * constants, so both surfaces behave identically. Consolidate into
 * @rpcs1/core if a third surface ever needs it.
 */

export type TextScale = 'default' | 'large' | 'larger';

export const TEXT_SCALE_FACTORS: Record<TextScale, number> = {
  default: 1,
  large: 1.15,
  larger: 1.3,
};

export function normalizeTextScale(v: unknown): TextScale {
  return v === 'large' || v === 'larger' ? v : 'default';
}

/** Response pacing setting: 0 (off) to 5000 ms; anything else → 0. */
export function clampResponseDelay(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0;
  if (n <= 0) return 0;
  return Math.min(n, 5000);
}

/**
 * Remaining wait before rendering a response: pacing is a FLOOR on
 * time-to-render, never an addend — a slow network already counts toward it.
 */
export function paceMs(settingMs: number, elapsedMs: number): number {
  const floor = clampResponseDelay(settingMs);
  const elapsed =
    typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  return Math.max(0, floor - elapsed);
}

/** Mobile-only hint: dictation comes from the OS keyboard, honestly stated. */
export function dictationHint(coarsePointer: boolean): string | null {
  return coarsePointer ? 'Tip: the mic key on your keyboard dictates straight into this box.' : null;
}

export interface LoopPrefs {
  textScale: TextScale;
  responseDelayMs: number;
  /** Free-text accommodation notes — the user's own words for their export. */
  notes: string;
}

export const DEFAULT_PREFS: LoopPrefs = { textScale: 'default', responseDelayMs: 0, notes: '' };

/** Notes are user-authored; cap defensively (matches accommodation.ts). */
export function normalizeNotes(v: unknown): string {
  return typeof v === 'string' ? v.slice(0, 2000) : '';
}

export const PREFS_KEY = 'ef-loop-prefs-v1';

/** Storage is injectable so tests never touch real localStorage. */
type KVStore = Pick<Storage, 'getItem' | 'setItem'>;

export function loadPrefs(store: KVStore | null): LoopPrefs {
  if (!store) return DEFAULT_PREFS;
  try {
    const raw = store.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<LoopPrefs>;
    return {
      textScale: normalizeTextScale(p.textScale),
      responseDelayMs: clampResponseDelay(p.responseDelayMs),
      notes: normalizeNotes(p.notes),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(store: KVStore | null, prefs: LoopPrefs): void {
  if (!store) return;
  try {
    store.setItem(
      PREFS_KEY,
      JSON.stringify({
        textScale: normalizeTextScale(prefs.textScale),
        responseDelayMs: clampResponseDelay(prefs.responseDelayMs),
        notes: normalizeNotes(prefs.notes),
      }),
    );
  } catch {
    /* storage full/blocked — prefs simply don't persist */
  }
}
