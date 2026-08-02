'use client';

/**
 * ReturnPanel — Stage B of the Full-Duplex Bridge (spec v0.2, A4/A5).
 *
 * The return leg: paste (or auto-detect via clipboard) an AI reply and read it
 * rendered for YOUR register. The engine is the existing /api/translate
 * `rewrite` path — profile-derived instructions executed by the budget-guarded
 * gateway, with the REWRITE_GUARD treating pasted text strictly as material.
 * When the free budget is exhausted or the gateway is down, the instructions
 * come back unexecuted with an honest note (never a silent failure).
 *
 * Transport (A4, corrected): a web page CANNOT listen for copies made in other
 * tabs. What it CAN do: once the user enables copy detection (one permission
 * prompt), we read the clipboard when THIS tab regains focus and offer to
 * translate what they copied. One tab-switch, zero pasting. Paste box remains
 * the always-works fallback.
 *
 * Demand measurement (the Stage B lean test): Vercel Analytics events —
 * return_leg_enable / offer_shown / offer_accepted / translate. Real feature
 * demand, not paste-tolerance.
 */

import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { useProfile } from '@/components/ProfileProvider';

const RHAT_KEY = 'rpcs1.rhat.v1';
const CLIP_ENABLED_KEY = 'rpcs1.return.clip.v1';
const MIN_REPLY_CHARS = 80;

interface RewriteResponse {
  rewritten: string | null;
  rewrite_instructions?: string;
  note?: string;
  engine?: string;
  error?: string;
}

function loadRhat(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(RHAT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, number>;
    return ['TI', 'SG', 'FT', 'UE', 'AR'].every((k) => typeof p[k] === 'number') ? p : null;
  } catch {
    return null;
  }
}

function safeTrack(event: string) {
  try {
    track(event);
  } catch {
    /* analytics unavailable — never break the feature */
  }
}

export default function ReturnPanel({ ownText }: { ownText: string }) {
  const { profile: styleKey } = useProfile();
  const [reply, setReply] = useState('');
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipEnabled, setClipEnabled] = useState(false);
  const [offer, setOffer] = useState<string | null>(null);
  const [usedRhat, setUsedRhat] = useState(false);
  const lastClipRef = useRef<string>('');

  // Restore the copy-detection preference (external store read on mount is
  // done lazily inside the focus subscription below; the toggle itself is
  // restored via lazy state init on first client render).
  useEffect(() => {
    // Subscribe to window focus — an external system — and offer to translate
    // whatever the user copied elsewhere. setState inside the event callback
    // is the sanctioned pattern.
    const onFocus = async () => {
      let enabled = clipEnabled;
      if (!enabled) {
        try {
          enabled = localStorage.getItem(CLIP_ENABLED_KEY) === '1';
          if (enabled) setClipEnabled(true);
        } catch {
          enabled = false;
        }
      }
      if (!enabled || !navigator.clipboard?.readText) return;
      try {
        const clip = (await navigator.clipboard.readText())?.trim() ?? '';
        if (
          clip.length >= MIN_REPLY_CHARS &&
          clip !== lastClipRef.current &&
          clip !== ownText.trim() &&
          clip !== reply.trim()
        ) {
          lastClipRef.current = clip;
          setOffer(clip);
          safeTrack('return_leg_offer_shown');
        }
      } catch {
        /* permission revoked or read denied — the paste box still works */
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [clipEnabled, ownText, reply]);

  const enableClipboard = async () => {
    try {
      await navigator.clipboard.readText(); // triggers the permission prompt
      localStorage.setItem(CLIP_ENABLED_KEY, '1');
      setClipEnabled(true);
      safeTrack('return_leg_enable');
    } catch {
      setError('Clipboard permission was denied — the paste box below works without it.');
    }
  };

  const translate = async (text: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    safeTrack('return_leg_translate');
    try {
      const rhat = loadRhat();
      setUsedRhat(rhat !== null);
      const body: Record<string, unknown> = {
        tool: 'rewrite',
        text,
        source: 'return-leg',
        ...(rhat ? { profile: rhat } : { style: styleKey }),
      };
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as RewriteResponse;
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]" data-testid="return-panel">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm text-neutral-300 hover:text-white">
        Bring the reply back
        <span className="ml-2 text-xs text-neutral-500">
          paste any AI answer — read it the way you talk
        </span>
      </summary>

      <div className="border-t border-white/5 p-4">
        {/* Clipboard offer — appears when a fresh copy is detected on tab focus */}
        {offer && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/[0.07] p-3" role="status" data-testid="clip-offer">
            <span className="text-sm text-sky-200">Translate what you just copied?</span>
            <button
              onClick={() => {
                setReply(offer);
                setOffer(null);
                safeTrack('return_leg_offer_accepted');
                void translate(offer);
              }}
              className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
            >
              Yes — in my words
            </button>
            <button
              onClick={() => setOffer(null)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Paste the AI's reply here…"
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-[#0a0f1a] p-4 text-sm text-gray-100 placeholder-gray-500 focus:border-sky-400/50 focus:outline-none resize-y"
          aria-label="AI reply to translate into your register"
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void translate(reply)}
            disabled={loading || reply.trim().length === 0}
            className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="return-translate"
          >
            {loading ? 'Translating…' : 'Read it in my words'}
          </button>
          {!clipEnabled && (
            <button
              onClick={() => void enableClipboard()}
              className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
            >
              Skip the pasting — detect what I copy
            </button>
          )}
          {clipEnabled && (
            <span className="text-xs text-neutral-500">
              Copy detection is on — copy a reply anywhere, then come back to this tab.
            </span>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}

        {result && (
          <div className="mt-4" data-testid="return-result">
            {result.rewritten ? (
              <pre className="whitespace-pre-wrap rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-4 text-sm text-gray-200">
                {result.rewritten}
              </pre>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs text-neutral-400">{result.note}</p>
                {result.rewrite_instructions && (
                  <>
                    <p className="mt-2 text-xs text-neutral-500">
                      Paste this into your own AI app as a system instruction, followed by the reply:
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-gray-300">
                      {result.rewrite_instructions}
                    </pre>
                  </>
                )}
              </div>
            )}
            {result.engine && result.rewritten && (
              <p className="mt-1 text-[11px] text-neutral-600">
                Facts unchanged, register translated. Always check the original for anything that matters.
              </p>
            )}
            {!usedRhat && (
              <p className="mt-2 text-xs text-neutral-500">
                That used the {styleKey} register.{' '}
                <a href="/calibrate" className="text-sky-500 underline-offset-4 hover:underline">
                  Calibrate once
                </a>{' '}
                and replies get tuned to your own profile instead.
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
