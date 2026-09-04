'use client';

/**
 * Fader — one vertical channel of a board, mixing-desk style.
 *
 * A native <input type="range"> rotated −90° (see .fader in globals.css):
 * min at the bottom, max at the top, a flat fader cap for a thumb, and a
 * level fill that rises from the bottom like an EQ band. Keeping the native
 * control means keyboard (arrow keys), screen readers (aria-orientation +
 * aria-valuetext), and touch all work without a custom drag widget.
 */

import type { CSSProperties } from 'react';

export interface FaderProps {
  id: string;
  /** Channel name printed under the fader. */
  name: string;
  /** Primitive abbreviation printed under the name (TI/SG/FT/UE/AR). */
  abbr: string;
  value: number;
  /** Accent color (hex) for the readout and the level fill. */
  accent: string;
  /** Spoken value for assistive tech — the channel's trace line. */
  valueText: string;
  onChange: (value: number) => void;
  /** Fired when the user touches or focuses this channel (drives the board's strip). */
  onActive: () => void;
}

export function Fader({ id, name, abbr, value, accent, valueText, onChange, onActive }: FaderProps) {
  const style = { '--fader-accent': accent, '--fader-v': `${value}%` } as CSSProperties;
  return (
    <div className="flex w-11 flex-col items-center">
      <output htmlFor={id} className="font-mono text-[11px] leading-4" style={{ color: accent }}>
        {value}
      </output>
      <div className="fader-wrap">
        <div className="fader-ticks" aria-hidden />
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={onActive}
          onPointerDown={onActive}
          aria-orientation="vertical"
          aria-valuetext={valueText}
          className="fader"
          style={style}
        />
      </div>
      <label htmlFor={id} className="mt-1 text-center leading-tight">
        <span className="block text-[11px] font-semibold text-white/85">{name}</span>
        <span className="block font-mono text-[10px] text-white/40">{abbr}</span>
      </label>
    </div>
  );
}
