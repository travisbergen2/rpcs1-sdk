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
import { PRESET_GRADE_NOTE, type BoardPreset, type DialKey, type DialSpec } from '@/lib/instrument';

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
  /** One-tap starting positions (all five faders at once). Provisional sketches, labeled as such in the strip. */
  presets?: BoardPreset[];
  onPreset?: (profile: ReceiverProfile, preset: BoardPreset) => void;
  footer?: ReactNode;
}

const SCALE = [100, 75, 50, 25, 0] as const;

export function FaderBoard({
  side,
  title,
  accent,
  dials,
  profile,
  why,
  vector,
  extra,
  onChange,
  presets,
  onPreset,
  footer,
}: FaderBoardProps) {
  const [active, setActive] = useState<DialKey | null>(null);
  const [activePreset, setActivePreset] = useState<BoardPreset | null>(null);
  const spec = active ? dials.find((d) => d.key === active) ?? null : null;

  // Touching a fader takes the board off the preset — the strip must never
  // claim a preset the faders no longer match.
  const touch = (key: DialKey) => {
    setActive(key);
    setActivePreset(null);
  };

  const choosePreset = (preset: BoardPreset) => {
    setActive(null);
    setActivePreset(preset);
    onPreset?.(preset.profile, preset);
  };

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
            onActive={() => touch(d.key)}
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
        ) : activePreset ? (
          <>
            <span className="text-white/90">
              preset: {activePreset.name}
            </span>
            <span className="text-white/45"> · {PRESET_GRADE_NOTE}</span>
            <br />
            <span style={{ color: accent }}>{activePreset.tagline}</span>
            <br />
            <span className="text-white/45">{vector}</span>
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

      {presets && presets.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={`${title} presets`}>
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-white/35">Presets</span>
          {presets.map((p) => {
            const selected = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p)}
                aria-pressed={selected}
                title={`${p.tagline} (${PRESET_GRADE_NOTE})`}
                className="min-h-9 rounded-full border px-3 py-1 text-[11px] transition-colors"
                style={
                  selected
                    ? { borderColor: accent, color: accent, background: 'rgba(255,255,255,0.04)' }
                    : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }
                }
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {footer && <div className="mt-2 text-[11px] text-white/45">{footer}</div>}
    </div>
  );
}
