'use client';

/**
 * SendBox — the SendRight box.
 *
 * Type like you talk → deterministic fork detection runs client-side on every
 * keystroke (debounced; mirror() is a pure function from @rpcs1/core, zero API
 * calls) → when the prompt forks, reading chips appear; tapping one appends its
 * clarifier → pick a model app → hand-off opens the user's own app with the
 * prompt pre-filled (or clipboard fallback). rpcs1 never makes the model call
 * and never sees the answer.
 *
 * UI contract (registered decision #2): the strip renders NOTHING on clean
 * prompts — silent until a fork is actually detected.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  mirror,
  applyReading,
  buildHandoff,
  listVendors,
  analyzeSprawl,
  rankPersonas,
  type AmbiguousSpan,
  type MirrorResult,
  type SprawlResult,
  type VendorId,
  type ForkKind,
} from '@rpcs1/core';
import BridgePanel from '@/components/BridgePanel';
import ModelPanel from '@/components/ModelPanel';
import ReturnPanel from '@/components/ReturnPanel';
import SprawlStrip from '@/components/SprawlStrip';

const DEBOUNCE_MS = 250;

/**
 * One-click demo prompts for the empty state — each triggers a different
 * detector so a first-time visitor sees the product work within 250ms
 * instead of staring at a silent box.
 */
const EXAMPLES: Array<{ label: string; prompt: string }> = [
  {
    label: 'Could be read two ways',
    prompt: 'What do you think about React or Vue for my project?',
  },
  {
    label: 'Contradicts itself',
    prompt: 'Keep it brief. I want a comprehensive breakdown of every step in the process.',
  },
  {
    label: 'Too many asks at once',
    prompt: 'Write a summary of my sales data from last quarter. Include the top five customers and their revenue totals. Also can you plan a birthday party for my daughter? She likes horses and the party is next month. What venues would work?',
  },
];

export default function SendBox() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<MirrorResult | null>(null);
  const [sprawl, setSprawl] = useState<SprawlResult | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [lockedKind, setLockedKind] = useState<ForkKind | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced deterministic mirror — pure client-side, no network.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult(mirror(text));
      setSprawl(analyzeSprawl(text));
    }, DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text]);

  const forked = result !== null && !result.clean && text.trim().length > 0;
  const vendors = useMemo(() => listVendors(), []);

  const lockReading = (id: string, summary: string, clarifier: string | null) => {
    if (!clarifier) return;
    setText((t) => applyReading(t, clarifier));
    setLockedNote(`Locked in: ${summary}`);
    setLockedKind((id.split(':')[0] as ForkKind) ?? null);
    setHandoffNote(null);
  };

  // Panel reading context: the locked fork kind wins; otherwise the primary
  // detected fork (panel stays non-blocking); otherwise the clean default.
  const panelKind: ForkKind | 'as_written' =
    lockedKind ?? (forked ? (result!.readings[0].id.split(':')[0] as ForkKind) : 'as_written');
  const clipboardVendors = useMemo(
    () => new Set(vendors.filter((v) => v.method === 'clipboard').map((v) => v.id as string)),
    [vendors],
  );

  const sendSegment = async (segmentText: string, vendor?: VendorId) => {
    const target = vendor ?? (rankPersonas(panelKind).top[0].card.vendor as VendorId);
    const plan = buildHandoff(target, segmentText);
    if (plan.method === 'clipboard' && plan.clipboardText !== null) {
      try { await navigator.clipboard.writeText(plan.clipboardText); } catch { /* instructions cover it */ }
    }
    setHandoffNote(plan.instructions);
    window.open(plan.url, '_blank', 'noopener,noreferrer');
  };

  const sendTo = async (vendor: VendorId) => {
    const plan = buildHandoff(vendor, text);
    if (plan.method === 'clipboard' && plan.clipboardText !== null) {
      try {
        await navigator.clipboard.writeText(plan.clipboardText);
      } catch {
        /* clipboard can be denied — instructions still tell the user what to do */
      }
    }
    setHandoffNote(plan.instructions);
    window.open(plan.url, '_blank', 'noopener,noreferrer');
  };

  // Squiggle overlay segments — split text at ambiguous span boundaries.
  // Spans carry [start, end) offsets from mirror(); render order is guaranteed.
  const spans: AmbiguousSpan[] = forked ? result!.ambiguousSpans : [];
  const segments = useMemo(() => {
    if (spans.length === 0 || text.length === 0) return null;
    const parts: Array<{ str: string; span: number | null }> = [];
    let cursor = 0;
    spans.forEach((sp, i) => {
      if (sp.start < cursor || sp.end > text.length) return; // overlap/stale guard — skip rather than corrupt segments
      if (sp.start > cursor) parts.push({ str: text.slice(cursor, sp.start), span: null });
      parts.push({ str: text.slice(sp.start, sp.end), span: i });
      cursor = sp.end;
    });
    if (cursor < text.length) parts.push({ str: text.slice(cursor), span: null });
    return parts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, result]);

  // Tap-to-expand: if the caret lands inside a squiggled span, open that span's readings.
  const revealSpanAtCaret = (el: HTMLTextAreaElement) => {
    const pos = el.selectionStart;
    if (pos === null || spans.length === 0) { setActiveSpan(null); return; }
    const hit = spans.findIndex((sp) => pos >= sp.start && pos <= sp.end);
    setActiveSpan(hit === -1 ? null : hit);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative rounded-2xl border border-white/10 bg-[#0a0f1a] shadow-[0_0_40px_-12px_rgba(16,185,129,0.25)] transition-shadow focus-within:border-emerald-400/50 focus-within:shadow-[0_0_50px_-8px_rgba(16,185,129,0.4)]">
        {/* Backdrop clone — renders the amber squiggles under the (transparent-bg) textarea.
            Same metrics as the textarea; text is transparent so only underlines show. */}
        {segments !== null && (
          <div
            ref={backdropRef}
            aria-hidden
            data-testid="squiggle-backdrop"
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-5 text-base text-transparent"
          >
            {segments.map((seg, i) =>
              seg.span === null ? (
                <span key={i}>{seg.str}</span>
              ) : (
                <span
                  key={i}
                  style={{
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'wavy',
                    textDecorationColor: seg.span === activeSpan ? '#fbbf24' : '#d97706',
                    textDecorationThickness: '2px',
                    textUnderlineOffset: '4px',
                  }}
                >
                  {seg.str}
                </span>
              ),
            )}
          </div>
        )}
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setLockedNote(null); setLockedKind(null); setActiveSpan(null); }}
        onClick={(e) => revealSpanAtCaret(e.currentTarget)}
        onKeyUp={(e) => revealSpanAtCaret(e.currentTarget)}
        onScroll={(e) => { if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop; }}
        placeholder="Say it your way…"
        rows={5}
        className="relative w-full rounded-2xl bg-transparent p-5 text-base text-gray-100 placeholder-gray-500 focus:outline-none resize-y"
        aria-label="Your prompt"
      />
      </div>

      {/* Span callout — opens when the caret lands on a squiggle (tap or arrow keys) */}
      {activeSpan !== null && spans[activeSpan] && (
        <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3" data-testid="span-callout" role="status">
          <p className="text-xs text-amber-200/80">
            <span className="font-medium text-amber-200">&ldquo;{spans[activeSpan].text}&rdquo;</span>
            {' — '}{spans[activeSpan].why}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {spans[activeSpan].readings.map((r) => (
              <button
                key={r.id}
                onClick={() => { lockReading(`${spans[activeSpan].kind}:${r.id}`, r.summary, r.clarifier); setActiveSpan(null); }}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 transition-colors"
              >
                {r.summary}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — show what this is and let visitors trigger it in one click */}
      {text.trim().length === 0 && (
        <div className="mt-3" data-testid="empty-state">
          <p className="text-sm text-neutral-400">
            Type a prompt like you&apos;d say it out loud. If it can be misread, the readings
            appear here <span className="text-neutral-300">before</span> you send it — then one
            tap opens your own AI app with the clear version filled in.
          </p>
          <p className="mt-3 text-xs text-neutral-400">Or watch it catch something — try one:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setText(ex.prompt)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-gray-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
              >
                {ex.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-neutral-400">
            Nothing is sent anywhere until you pick an app and hit send there yourself.
          </p>
        </div>
      )}

      {/* Reading chips — render ONLY when a fork is detected (silent-strip contract) */}
      {forked && (
        <div className="mt-3" data-testid="chip-strip">
          <p role="status" className="mb-2 text-sm text-neutral-400">
            This could be read more than one way — tap what you meant:
          </p>
          <div className="flex flex-wrap gap-2">
            {result!.readings.map((r) => (
              <button
                key={r.id}
                onClick={() => lockReading(r.id, r.summary, r.clarifier)}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-200 shadow-sm hover:bg-amber-500/20 hover:border-amber-300/60 transition-colors"
              >
                {r.summary}
              </button>
            ))}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-400">
              why?
            </summary>
            <ul className="mt-1 space-y-1 text-xs text-neutral-400">
              {result!.ambiguousSpans.map((s, i) => (
                <li key={i}>
                  <span className="text-neutral-300">&ldquo;{s.text}&rdquo;</span> — {s.why}
                </li>
              ))}
            </ul>
          </details>
          {/* Share the mirror moment — the fork itself is the most convincing ad */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={async () => {
                const n = result!.readings.length;
                const shareText = `I pasted my prompt into SendRight and it found ${n} different things my words could mean — before the AI picked the wrong one. Free, no signup: https://rpcs1.dev/send`;
                try {
                  if (navigator.share) {
                    await navigator.share({ text: shareText });
                    setShareNote('Shared.');
                  } else {
                    await navigator.clipboard.writeText(shareText);
                    setShareNote('Copied — paste it anywhere.');
                  }
                } catch {
                  /* user cancelled the share sheet — no note needed */
                }
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-gray-400 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
              data-testid="share-mirror"
            >
              Share what it caught
            </button>
            {shareNote && (
              <span className="text-xs text-emerald-400" role="status">{shareNote}</span>
            )}
          </div>
        </div>
      )}

      {/* Sprawl outline — renders only when the prompt genuinely sprawls */}
      {sprawl !== null && text.trim().length > 0 && (
        <SprawlStrip result={sprawl} onSendSegment={sendSegment} />
      )}

      {lockedNote && (
        <p className="mt-2 text-sm text-emerald-400" role="status">{lockedNote}</p>
      )}

      {/* Model panel — top-3 receiver personas for the current reading */}
      {text.trim().length > 0 && (
        <div className="mt-4">
          <ModelPanel
            kind={panelKind}
            clipboardVendors={clipboardVendors}
            onPick={(v) => sendTo(v as VendorId)}
          />
        </div>
      )}

      {/* Bridge dials — Stage A: deterministic axis transforms with live preview */}
      <BridgePanel
        text={text}
        onApply={(next) => { setText(next); setLockedNote(null); setLockedKind(null); setActiveSpan(null); }}
      />

      {handoffNote && (
        <p className="mt-3 text-sm text-neutral-400" role="status">{handoffNote}</p>
      )}

      {/* Return leg — Stage B: read the AI's reply in your own register */}
      <ReturnPanel ownText={text} />
    </div>
  );
}
