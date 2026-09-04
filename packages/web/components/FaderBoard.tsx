'use client';

/**
 * FaderBoard — five channels side by side, like a graphic EQ.
 *
 * Header: the board's title and its vector. Bank: a 0–100 scale column with
 * the center detent (50 = the neutral profile, the EQ's "flat" line) and one
 * Fader per primitive. Strip: an LCD-style readout — the touched channel's
 * name, value, what down/up mean on it, and the engine's trace line for it;
 * the vector (and any extra line, e.g. the regime) when idle.
 */

import { useState, type ReactNode } from 'react';
import type { ReceiverProfile } from '@rpcs1/core';
import { Fader } from '@/components/Fader';
import type { DialKey, DialSpec } from '@/lib/instrument';

export interface FaderBoardProps {
  side: 'you' | 'model';
  title: string;
  /** Accent color (hex). */
  accent: string;
  dials: DialSpec[];
  profile: ReceiverProfile;
  /** Per-channel trace lines from the engine, keyed by primitive. */
  why: Record<DialKey, string>;
  vector: string;
  /** Extra idle-strip line (e.g. the model's regime). */
  extra?: string;
  onChange: (key: DialKey, value: number) => void;
  footer?: ReactNode;
}

const SCALE = [100, 75, 50, 25, 0] as const;

export function FaderBoard({ side, title, accent, dials, profile, why, vector, extra, onChange, footer }: FaderBoardProps) {
  const [active, setActive] = useState<DialKey | null>(null);
  const spec = active ? dials.find((d) => d.key === active) ?? null : null;

  return (
    <div
      role="group"
      aria-label={title}
      data-side={side}
      className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{title}</h2>
        <code className="font-mono text-[11px]" style={{ color: accent }}>
          {vector}
        </code>
      </div>

      <div className="mt-2 flex items-start justify-around gap-1">
        {/* Scale column — aligned to the fader travel (below the readout line, above the label). */}
        <div className="fader-scale" aria-hidden>
          {SCALE.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        {dials.map((d) => (
          <Fader
            key={d.key}
            id={`fader-${side}-${d.key}`}
            name={d.name}
            abbr={d.key}
            value={profile[d.key]}
            accent={accent}
            valueText={`${profile[d.key]} — ${why[d.key]}`}
            onChange={(v) => onChange(d.key, v)}
            onActive={() => setActive(d.key)}
          />
        ))}
      </div>

      {/* The strip — one line the board is "saying" right now. */}
      <div
        className="fader-strip mt-2 min-h-[2.75rem] rounded-lg border border-white/8 bg-[#070b14] px-3 py-2 font-mono text-[11px] leading-relaxed text-white/70"
        role="status"
        aria-live="polite"
      >
        {spec ? (
          <>
            <span className="text-white/90">
              {spec.name} ({spec.key}) {profile[spec.key]}
            </span>
            <span className="text-white/45">
              {' '}
              · down = {spec.low} · up = {spec.high}
            </span>
            <br />
            <span style={{ color: accent }}>{why[spec.key]}</span>
          </>
        ) : (
          <>
            <span className="text-white/45">{vector}</span>
            {extra && (
              <>
                <br />
                <span style={{ color: accent }}>{extra}</span>
              </>
            )}
          </>
        )}
      </div>

      {footer && <div className="mt-2 text-[11px] text-white/45">{footer}</div>}
    </div>
  );
}
