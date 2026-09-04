'use client';

/**
 * Instrument — the homepage IS the tool.
 *
 * Two panes: YOU (your words, as typed, with the deterministic fork squiggles)
 * and WHAT THE MODEL HEARS (the message as it parses, the questions it would
 * need answered, and the standing instruction built from the five dials).
 * Under them, the five dials — the receiver profile R̂ — and the literal
 * equation they produce. One send row that opens the user's own model app
 * with the exact previewed text. One info bubble that explains what is
 * happening, in the visitor's chosen reading register.
 *
 * Everything shown is computed client-side from @rpcs1/core's pure functions.
 * Nothing leaves the page until the user presses Send, and Send only opens
 * their own app (or copies to the clipboard where prefill is unsupported).
 */

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  applyReading,
  buildHandoff,
  listVendors,
  mirror,
  type AmbiguousSpan,
  type MirrorResult,
  type ReceiverProfile,
  type VendorId,
} from '@rpcs1/core';
import { StickerLogo } from '@/components/StickerLogo';
import { useProfile } from '@/components/ProfileProvider';
import { LANDING_COPY } from '@/lib/landing-copy';
import { BRAND_PROMISE } from '@/lib/brand';
import { DIALS, buildEquation, buildPayload, hear, type DialKey } from '@/lib/instrument';
import { useRhat } from '@/lib/rhat-store';

const DEBOUNCE_MS = 250;

/** Static beat titles; bodies come from the reading register (lib/landing-copy.ts). */
const BEAT_TITLES = ['Type like you talk', 'See what you said', 'Send the one you meant'] as const;

/** One-tap examples for the empty state — each trips a different detector. */
const EXAMPLES: Array<{ label: string; prompt: string }> = [
  { label: 'Could be read two ways', prompt: 'What do you think about React or Vue for my project?' },
  { label: 'Points at something not here', prompt: 'Fix it and send them the file.' },
  { label: 'Contradicts itself', prompt: 'Keep it brief. I want a comprehensive breakdown of every step in the process.' },
];

export default function Instrument() {
  const [text, setText] = useState('');
  const [rhat, setRhat] = useRhat();
  const [includeDials, setIncludeDials] = useState(true);
  const [vendor, setVendor] = useState<VendorId>('chatgpt');
  const [infoOpen, setInfoOpen] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [result, setResult] = useState<MirrorResult | null>(null);
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoId = useId();
  const mathId = useId();

  const { profile: register } = useProfile();
  const copy = LANDING_COPY[register];
  const vendors = useMemo(() => listVendors(), []);
  const vendorLabel = vendors.find((v) => v.id === vendor)?.label ?? 'your AI app';

  // Debounced deterministic mirror — pure client-side, no network.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult(mirror(text)), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);

  const equation = useMemo(() => buildEquation(rhat), [rhat]);
  const hearing = useMemo(() => hear(text, rhat), [text, rhat]);
  const payload = useMemo(
    () => buildPayload(text, rhat, { includeInstruction: includeDials }),
    [text, rhat, includeDials],
  );

  const forked = result !== null && !result.clean && text.trim().length > 0;
  const spans: AmbiguousSpan[] = forked ? result!.ambiguousSpans : [];

  // Squiggle overlay segments — split text at ambiguous span boundaries.
  const segments = useMemo(() => {
    if (spans.length === 0 || text.length === 0) return null;
    const parts: Array<{ str: string; span: number | null }> = [];
    let cursor = 0;
    spans.forEach((sp, i) => {
      if (sp.start < cursor || sp.end > text.length) return; // stale/overlap guard
      if (sp.start > cursor) parts.push({ str: text.slice(cursor, sp.start), span: null });
      parts.push({ str: text.slice(sp.start, sp.end), span: i });
      cursor = sp.end;
    });
    if (cursor < text.length) parts.push({ str: text.slice(cursor), span: null });
    return parts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, result]);

  const revealSpanAtCaret = (el: HTMLTextAreaElement) => {
    const pos = el.selectionStart;
    if (pos === null || spans.length === 0) {
      setActiveSpan(null);
      return;
    }
    const hit = spans.findIndex((sp) => pos >= sp.start && pos <= sp.end);
    setActiveSpan(hit === -1 ? null : hit);
  };

  const lockReading = (summary: string, clarifier: string | null) => {
    if (!clarifier) return;
    setText((t) => applyReading(t, clarifier));
    setLockedNote(`Locked in: ${summary}`);
    setActiveSpan(null);
    setHandoffNote(null);
  };

  const setDial = (key: DialKey, value: number) => setRhat({ ...rhat, [key]: value } as ReceiverProfile);

  const send = async () => {
    const handoff = buildHandoff(vendor, payload);
    if (handoff.method === 'clipboard' && handoff.clipboardText !== null) {
      try {
        await navigator.clipboard.writeText(handoff.clipboardText);
      } catch {
        /* clipboard can be denied — the instruction line still says what to do */
      }
    }
    setHandoffNote(handoff.instructions);
    window.open(handoff.url, '_blank', 'noopener,noreferrer');
  };

  const onTextChange = (v: string) => {
    setText(v);
    setLockedNote(null);
    setActiveSpan(null);
    setHandoffNote(null);
  };

  return (
    <section id="box" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-8 sm:px-6" aria-label="The instrument">
      {/* ── Header: sticker, promise, info bubble ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StickerLogo size="nav" />
          <h1 className="text-sm font-semibold tracking-tight text-white/80 sm:text-base">{BRAND_PROMISE}</h1>
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen((o) => !o)}
          aria-expanded={infoOpen}
          aria-controls={infoId}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
        >
          <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/60 font-mono text-[11px]">
            i
          </span>
          What is this doing?
        </button>
      </div>

      {infoOpen && (
        <div
          id={infoId}
          role="region"
          aria-label="What this is doing"
          className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 text-sm leading-relaxed text-white/75"
        >
          <p>{copy.sub}</p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {BEAT_TITLES.map((title, i) => (
              <li key={title} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="font-mono text-[11px] text-white/40">{i + 1}</p>
                <p className="mt-1 font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-white/60">{copy.beats[i]}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 font-semibold text-white">The five dials</p>
          <p className="mt-1 text-xs text-white/60">{copy.dials}</p>
          <p className="mt-3 text-xs text-white/50">
            You&apos;re reading this in the <span className="text-sky-300">{register}</span> register — the &ldquo;Reading
            as&rdquo; switch in the header changes it. The mechanism, one click deep:{' '}
            <Link href="/docs/primitives" className="text-sky-300 underline-offset-4 hover:underline">
              the five primitives
            </Link>
            .
          </p>
        </div>
      )}

      {/* ── Two panes ─────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Left: YOU */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">You</h2>
            <span className="text-[11px] text-white/35">as typed</span>
          </div>

          <div className="relative mt-3 rounded-xl border border-white/10 bg-[#070b14] focus-within:border-emerald-400/50">
            {segments !== null && (
              <div
                ref={backdropRef}
                aria-hidden
                data-testid="squiggle-backdrop"
                className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 text-base leading-relaxed text-transparent"
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
              onChange={(e) => onTextChange(e.target.value)}
              onClick={(e) => revealSpanAtCaret(e.currentTarget)}
              onKeyUp={(e) => revealSpanAtCaret(e.currentTarget)}
              onScroll={(e) => {
                if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              placeholder="Say it your way…"
              rows={7}
              aria-label="Your words"
              className="relative w-full resize-y rounded-xl bg-transparent p-4 text-base leading-relaxed text-gray-100 placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Span callout — the caret landed on a squiggle */}
          {activeSpan !== null && spans[activeSpan] && (
            <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3" role="status">
              <p className="text-xs text-amber-200/80">
                <span className="font-medium text-amber-200">&ldquo;{spans[activeSpan].text}&rdquo;</span>
                {' — '}
                {spans[activeSpan].why}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {spans[activeSpan].readings.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => lockReading(r.summary, r.clarifier)}
                    className="min-h-9 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
                  >
                    {r.summary}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fork chips — render only when a fork is detected (silent-strip contract) */}
          {forked && activeSpan === null && (
            <div className="mt-3" data-testid="chip-strip">
              <p role="status" className="mb-2 text-xs text-white/50">
                This could be read more than one way — tap what you meant:
              </p>
              <div className="flex flex-wrap gap-2">
                {result!.readings.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => lockReading(r.summary, r.clarifier)}
                    className="min-h-9 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
                  >
                    {r.summary}
                  </button>
                ))}
              </div>
            </div>
          )}

          {lockedNote && (
            <p className="mt-2 text-xs text-emerald-400" role="status">
              {lockedNote}
            </p>
          )}

          {/* Empty state — quiet, one line, three examples */}
          {text.trim().length === 0 && (
            <div className="mt-3" data-testid="empty-state">
              <p className="text-xs text-white/45">Try one:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => onTextChange(ex.prompt)}
                    className="min-h-9 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-gray-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: WHAT THE MODEL HEARS */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">What the model hears</h2>
            <span className="text-[11px] text-white/35">as it will receive it</span>
          </div>

          <div className="mt-3 space-y-3 text-sm">
            {hearing === null ? (
              <p className="text-white/35">Nothing yet — type on the left.</p>
            ) : (
              <>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">Reads as</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-gray-100">{hearing.readsAs}</p>
                  <p className="mt-1 text-[11px] text-white/40">
                    taken as: {hearing.intent.replace('_', ' ')} (a guess)
                    {forked && <> · {result!.readings.length} readings — tap one on the left to lock it</>}
                  </p>
                </div>
                {hearing.wouldAsk.length > 0 && (
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-amber-300/70">It would need to ask</p>
                    <ul className="mt-1 space-y-1 text-amber-100/80">
                      {hearing.wouldAsk.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[11px] text-white/40">
                  {hearing.playback
                    ? 'It should check its reading with you before answering.'
                    : 'It can answer without checking first.'}
                </p>
              </>
            )}

            <div className="border-t border-white/8 pt-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-sky-300/70">
                Standing instruction — from your dials
              </p>
              <p className="mt-1 leading-relaxed text-white/75">{equation.instruction}</p>
              {!includeDials && (
                <p className="mt-1 text-[11px] text-white/40">Not sent — &ldquo;send the dials&rdquo; is off.</p>
              )}
            </div>

            {text.trim().length > 0 && (
              <details className="border-t border-white/8 pt-3">
                <summary className="cursor-pointer text-[11px] text-white/45 hover:text-white/70">
                  Exact text that will be sent
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/8 bg-[#070b14] p-3 font-mono text-[12px] leading-relaxed text-white/70">
                  {payload}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* ── Five dials — the receiver profile, literally ───────────────────── */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Five dials</h2>
          <code className="font-mono text-xs text-sky-300">{equation.vector}</code>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {DIALS.map((spec) => {
            const term = equation.terms.find((t) => t.key === spec.key)!;
            const id = `dial-${spec.key}`;
            return (
              <div key={spec.key}>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={id} className="text-sm font-semibold text-white">
                    {spec.name}
                  </label>
                  <output htmlFor={id} className="font-mono text-xs text-sky-300">
                    {spec.key} {term.value}
                  </output>
                </div>
                <p className="mt-0.5 text-[11px] text-white/40">{spec.scientific}</p>
                <div className="flex min-h-11 items-center">
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={term.value}
                    onChange={(e) => setDial(spec.key, Number(e.target.value))}
                    aria-valuetext={`${term.value} — ${term.why}`}
                    className="w-full cursor-pointer accent-sky-400"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-white/45">
                  <span>{spec.low}</span>
                  <span>{spec.high}</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-white/55">{term.why}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/45">
          <button
            type="button"
            onClick={() => setShowMath((s) => !s)}
            aria-expanded={showMath}
            aria-controls={mathId}
            className="min-h-9 text-sky-300/80 underline-offset-4 hover:underline"
          >
            {showMath ? 'Hide the math' : 'Show the math'}
          </button>
          <Link href="/calibrate" className="min-h-9 inline-flex items-center underline-offset-4 hover:text-white hover:underline">
            Set the dials by answering five questions →
          </Link>
        </div>

        {showMath && (
          <div id={mathId} className="mt-3 rounded-xl border border-white/8 bg-[#070b14] p-3">
            <p className="text-[11px] text-white/45">
              The same five numbers, read as an agent configuration (generic platform ranges). A chat app cannot take
              these from a prefilled message — the standing instruction above is what travels. Each line states the rule
              and the value it produced; the rules are checked against the engine in the test suite.
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-white/70">
              {equation.agent.lines.join('\n')}
            </pre>
            <p className="mt-2 font-mono text-[11px] text-white/40">
              band rule: value &lt; 40 → low · 40–60 → mid · value &gt; 60 → high
              {hearing ? ` · commit-vs-clarify level: ${hearing.arLevel}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Send row ──────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
        <label className="flex min-h-11 items-center gap-2 text-sm text-white/70">
          Send to
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value as VendorId)}
            aria-label="Which AI app to open"
            className="rounded-lg border border-white/10 bg-gray-900 px-2 py-1.5 text-sm text-white"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
                {v.method === 'clipboard' ? ' (copies, then opens)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={includeDials}
            onChange={(e) => setIncludeDials(e.target.checked)}
            className="h-4 w-4 accent-sky-400"
          />
          Send the dials with it
        </label>
        <button
          type="button"
          onClick={send}
          disabled={text.trim().length === 0}
          className="min-h-11 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Open in {vendorLabel}
        </button>
        <p className="basis-full text-[11px] text-white/40">
          Nothing is sent from this page. Your own app opens with the text filled in; you press send there. Your words
          and dials stay in this browser until then.
        </p>
        {handoffNote && (
          <p className="basis-full text-xs text-white/60" role="status">
            {handoffNote}
          </p>
        )}
      </div>
    </section>
  );
}
