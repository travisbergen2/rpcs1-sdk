// ── UI preference helpers (pure: no Obsidian imports — fully unit-testable) ───
//
// M1 accessibility/mobile pass. These helpers keep every user-facing
// accessibility behavior deterministic and testable:
//  - panel text scale (never overrides Obsidian's app-wide settings)
//  - response pacing (a FLOOR on time-to-render, never an addend on top of
//    slow networks — some users need the AI to not respond instantly)
//  - screen-reader labels for interpretation lines (lock state is conveyed
//    by aria-pressed; the label adds what changed this round)
//  - the mobile dictation hint (honest OS-dictation affordance — the plugin
//    ships no speech pipeline of its own)

export type TextScale = 'default' | 'large' | 'larger';

export const TEXT_SCALE_FACTORS: Record<TextScale, number> = {
  default: 1,
  large: 1.15,
  larger: 1.3,
};

/** Settings values arrive from data.json as unknown — normalize defensively. */
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
 * Remaining wait before rendering a response, given the configured pacing
 * floor and how long the request already took. A 3s network call already
 * satisfies a 2s pacing floor — pacing never punishes slow connections.
 */
export function paceMs(settingMs: number, elapsedMs: number): number {
  const floor = clampResponseDelay(settingMs);
  const elapsed = typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  return Math.max(0, floor - elapsed);
}

/**
 * Screen-reader label for an interpretation line. Lock state itself is
 * announced via aria-pressed on the button; this label appends provenance —
 * REAL data only (kept/revised from the API), never a confidence claim.
 */
export function srSpanLabel(text: string, locked: boolean, status?: 'kept' | 'revised'): string {
  if (locked) return `${text} — locked`;
  if (status === 'revised') return `${text} — rewritten this round`;
  return text;
}

/** Mobile-only hint: dictation comes from the OS keyboard, honestly stated. */
export function dictationHint(isMobile: boolean): string | null {
  return isMobile ? 'Tip: the mic key on your keyboard dictates straight into this box.' : null;
}
