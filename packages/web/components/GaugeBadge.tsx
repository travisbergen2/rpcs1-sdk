'use client';

/**
 * Psychophant gauge badge (M4) — Tier S1 per the E-SYC-1 verdict (2026-08-29,
 * PASS-SYNTHETIC). Delta-only language; the warranted-agreement caveat is
 * built into the flagged string; the synthetic-validation disclosure is one
 * tap away. The badge informs — it never auto-suppresses or auto-corrects.
 *
 * Announcements ride the page's persistent polite live region (passed in as
 * onAnnounce) rather than a second region — one region that always exists
 * beats two that might not announce.
 */

import { GAUGE_DISCLOSURE, GAUGE_STRINGS, type GaugeReading } from '@/lib/gauge';

const DOT: Record<GaugeReading['state'], string> = {
  watching: 'bg-neutral-500',
  normal: 'bg-emerald-500',
  elevated: 'bg-amber-400',
  flagged: 'bg-orange-500',
};

const LABEL: Record<GaugeReading['state'], string> = {
  watching: 'agreement meter: watching',
  normal: 'agreement meter: steady',
  elevated: 'agreement meter: rising',
  flagged: 'agreement meter: sustained rise',
};

export function GaugeBadge({ reading }: { reading: GaugeReading }) {
  return (
    <details className="relative inline-block text-xs">
      <summary
        className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1.5 opacity-80 transition hover:opacity-100"
        aria-label={`${LABEL[reading.state]} — tap for what this means`}
      >
        {/* State is never color-only: the dot is paired with the text label. */}
        <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[reading.state]}`} />
        {LABEL[reading.state]}
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-left shadow-xl">
        <p>{GAUGE_STRINGS[reading.state]}</p>
        <p className="mt-2 opacity-60">{GAUGE_DISCLOSURE}</p>
      </div>
    </details>
  );
}
