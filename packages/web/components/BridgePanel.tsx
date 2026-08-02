'use client';

/**
 * BridgePanel — Stage A of the Full-Duplex Bridge (spec v0.2, A1–A3).
 *
 * Four sliders, one per measured axis (the E-RX-1 directive bundle). Moving a
 * slider applies a DETERMINISTIC transform and updates the preview live — $0
 * inference, so no release-gating is needed (that constraint is reserved for
 * future model-backed axes). "Use this version" writes the transformed text
 * back into the box.
 *
 * Implicit capture (A3): applied coordinates are logged to localStorage as
 * vector deltas — no account, no network. The stored modal coordinates preset
 * the sliders on the next visit, so the tool quietly converges on how this
 * person actually sends. Edits after Apply remain the escape hatch.
 */

import { useMemo, useState } from 'react';
import { AXES, IDENTITY_COORDS, applyAxes, type AxisCoords, type AxisId } from '@rpcs1/core';

const STORE_KEY = 'rpcs1.bridge.profile.v1';

interface StoredProfile {
  /** Sum of applied positions per axis, and how many applies total. */
  sums: Record<AxisId, number>;
  applies: number;
}

function loadProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProfile;
    if (typeof parsed?.applies !== 'number' || parsed.applies <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function presetFromProfile(p: StoredProfile | null): AxisCoords {
  if (!p) return { ...IDENTITY_COORDS };
  const out = { ...IDENTITY_COORDS };
  for (const axis of AXES) {
    const modal = Math.round((p.sums[axis.id] ?? 0) / p.applies);
    out[axis.id] = Math.max(0, Math.min(axis.positions - 1, modal));
  }
  return out;
}

function logApply(coords: AxisCoords) {
  try {
    const prev = loadProfile() ?? {
      sums: { urgency: 0, register: 0, fencing: 0, commentary: 0 },
      applies: 0,
    };
    for (const axis of AXES) prev.sums[axis.id] = (prev.sums[axis.id] ?? 0) + coords[axis.id];
    prev.applies += 1;
    localStorage.setItem(STORE_KEY, JSON.stringify(prev));
  } catch {
    /* storage can be denied — the feature degrades to stateless, never breaks */
  }
}

export default function BridgePanel({
  text,
  onApply,
}: {
  text: string;
  onApply: (next: string) => void;
}) {
  const [coords, setCoords] = useState<AxisCoords>({ ...IDENTITY_COORDS });
  const [applied, setApplied] = useState(false);
  const [touched, setTouched] = useState(false);

  const result = useMemo(() => applyAxes(text, coords), [text, coords]);
  const changed = result.moves.length > 0;
  const isIdentity = AXES.every((a) => coords[a.id] === 0);

  if (text.trim().length === 0) return null;

  return (
    <details
      className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]"
      data-testid="bridge-panel"
      onToggle={(e) => {
        // Preset sliders from the stored profile when the drawer opens (A3
        // personalization v0) — a user event, so no effect-driven setState.
        if ((e.target as HTMLDetailsElement).open && !touched) {
          setCoords(presetFromProfile(loadProfile()));
        }
      }}
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm text-neutral-300 hover:text-white">
        Tune for sending
        <span className="ml-2 text-xs text-neutral-500">
          four dials, measured effect — 69%→96% format compliance in registered testing
        </span>
      </summary>

      <div className="border-t border-white/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {AXES.map((axis) => (
            <div key={axis.id}>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`axis-${axis.id}`} className="text-sm text-neutral-200">
                  {axis.label}
                </label>
                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-500/70">
                  measured
                </span>
              </div>
              <input
                id={`axis-${axis.id}`}
                type="range"
                min={0}
                max={axis.positions - 1}
                step={1}
                value={coords[axis.id]}
                onChange={(e) => {
                  setApplied(false);
                  setTouched(true);
                  setCoords((c) => ({ ...c, [axis.id]: Number(e.target.value) }));
                }}
                className="mt-1 w-full accent-emerald-400"
                aria-label={`${axis.label}: ${coords[axis.id] === 0 ? axis.lowLabel : axis.highLabel}`}
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>{axis.lowLabel}</span>
                <span>{axis.highLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live preview — deterministic, so it updates as the dial moves */}
        {!isIdentity && (
          <div className="mt-4" data-testid="bridge-preview">
            {changed ? (
              <>
                <p className="mb-1 text-xs text-neutral-500">
                  {result.moves.map((m) => m.note).join(' · ')}
                </p>
                <pre className="whitespace-pre-wrap rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-sm text-gray-200">
                  {result.text}
                </pre>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      onApply(result.text);
                      logApply(coords);
                      setApplied(true);
                    }}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                    data-testid="bridge-apply"
                  >
                    Use this version
                  </button>
                  <span className="text-xs text-neutral-500">
                    You can still edit every word after applying.
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500">
                Nothing in this prompt matches those dials — it already sends clean.
              </p>
            )}
          </div>
        )}

        {applied && (
          <p className="mt-2 text-xs text-emerald-400" role="status">
            Applied — and remembered for next time.
          </p>
        )}
      </div>
    </details>
  );
}
