'use client';

/**
 * Instrument — the homepage IS the tool: one conversation in two registers,
 * and nothing on the face that needs explaining (Travis, 2026-09-07: "too
 * much conversation … collapse the sliders down like the options in this
 * text box; it should be simple enough not to need explanation").
 *
 * The face: two columns — YOU (your words; every reply in your words) and
 * THE MODEL (its context window: your message as it rewrites it for itself,
 * stoppable / editable / correctable, nothing runs until Go; its reply in its
 * own words, the model named under it) — and one text box.
 *
 * Everything else lives in the text box's toolbar, collapsed by default, like
 * the options in a chat composer: your board and the model's board (the two
 * fader banks, one icon each), the "what is this doing?" note, the applied
 * settings and their math, and the what-leaves-your-machine disclosure.
 *
 * Both boards are applied for real (lib/transcript.ts): the model's sets the
 * call's parameters and stance, yours governs the re-rendering.
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
import { FaderBoard } from '@/components/FaderBoard';
import { useProfile } from '@/components/ProfileProvider';
import { LANDING_COPY } from '@/lib/landing-copy';
import { BRAND_PROMISE } from '@/lib/brand';
import {
  DIALS,
  MODEL_DIALS,
  MODEL_PRESETS,
  NEUTRAL_PROFILE,
  buildEquation,
  buildModelEquation,
  buildPayload,
  profilesEqual,
  type DialKey,
} from '@/lib/instrument';
import { useModelRhat, useRhat } from '@/lib/rhat-store';
import {
  LIMITS,
  WHAT_LEAVES,
  addCorrection,
  appendField,
  contextFor,
  newTurn,
  parseFrames,
  patchTurn,
  pendingTurn,
  registerSample,
  removeTurn,
  type Frame,
  type Turn,
} from '@/lib/transcript';
import { clearTranscript, readTranscript, updateTranscript, useTranscript } from '@/lib/transcript-store';

const DEBOUNCE_MS = 250;

/** Board accents: sky for you, violet for the model. */
const ACCENT_YOU = '#38bdf8';
const ACCENT_MODEL = '#a78bfa';

/** Static beat titles; bodies come from the reading register (lib/landing-copy.ts). */
const BEAT_TITLES = ['Say it your way', 'See how it read you', 'Read the answer your way'] as const;

/** One-tap examples for the empty state — each trips a different detector. */
const EXAMPLES: Array<{ label: string; prompt: string }> = [
  { label: 'Could be read two ways', prompt: 'What do you think about React or Vue for my project?' },
  { label: 'Points at something not here', prompt: 'Fix it and send them the file.' },
  { label: 'Contradicts itself', prompt: 'Keep it brief. I want a comprehensive breakdown of every step in the process.' },
];

const makeId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * POST to the transcript route and hand every NDJSON frame to onFrame as it
 * arrives. Throws Error(message) on a non-2xx response (the route's JSON
 * error) or when onFrame throws (an error frame); rejects with AbortError on
 * Stop.
 */
async function streamTranscript(
  body: Record<string, unknown>,
  onFrame: (f: Frame) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/transcript', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = 'Something went wrong — try again.';
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) message = j.message;
    } catch {
      /* keep the default */
    }
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    carry = parseFrames(carry + decoder.decode(value, { stream: true }), onFrame);
  }
  if (carry.trim()) parseFrames(carry + '\n', onFrame);
}

function Caret() {
  return <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-white/60 align-middle" />;
}

/** The sliders glyph — the same idea as the options icon in a chat composer. */
function SlidersGlyph({ color }: { color: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" width="18" height="18" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke={color} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="5" r="2.2" fill={color} />
      <circle cx="13" cy="10" r="2.2" fill={color} />
      <circle cx="9" cy="15" r="2.2" fill={color} />
    </svg>
  );
}

interface ToolButtonProps {
  label: string;
  active: boolean;
  controls: string;
  dot?: boolean;
  accent: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolButton({ label, active, controls, dot, accent, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={active}
      aria-controls={controls}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
        active ? 'border-white/25 bg-white/[0.08]' : 'border-transparent hover:border-white/15 hover:bg-white/[0.04]'
      }`}
    >
      {children}
      {dot && <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
    </button>
  );
}

// ─── One turn: two rows, two registers ───────────────────────────────────────

interface RowProps {
  turn: Turn;
  isLast: boolean;
  answering: boolean;
  vendors: ReturnType<typeof listVendors>;
  vendor: VendorId;
  onVendor: (v: VendorId) => void;
  onGo: (id: string) => void;
  onStop: () => void;
  onDrop: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  onRetryRead: (id: string) => void;
  onAnswerAgain: (id: string) => void;
  onHandoff: (turn: Turn) => void;
}

const CELL_YOU = 'rounded-2xl border border-sky-400/20 bg-sky-500/[0.05] p-3';
const CELL_MODEL = 'rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-3';
const TEXT = 'whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100';

function TurnRow({
  turn,
  isLast,
  answering,
  vendors,
  vendor,
  onVendor,
  onGo,
  onStop,
  onDrop,
  onEdit,
  onRetryRead,
  onAnswerAgain,
  onHandoff,
}: RowProps) {
  const streaming = turn.readingStatus === 'streaming';
  const awaiting = turn.readingStatus === 'awaiting';
  const confirmed = turn.readingStatus === 'confirmed';
  const failed = turn.readingStatus === 'error';
  const readingRows = Math.min(14, Math.max(3, turn.reading.split('\n').length + 1));
  const vendorLabel = vendors.find((v) => v.id === vendor)?.label ?? 'your app';

  return (
    <li className="grid gap-3 md:grid-cols-2" data-turn={turn.id}>
      {/* Row 1, left: your words (and your corrections) */}
      <div className={CELL_YOU}>
        <p className={TEXT}>{turn.you}</p>
        {turn.corrections.map((c, i) => (
          <p key={i} className={`${TEXT} mt-2 border-l-2 border-sky-400/40 pl-2 text-gray-200`}>
            {c}
          </p>
        ))}
      </div>

      {/* Row 1, right: the model's reading of them */}
      <div className={awaiting ? `${CELL_MODEL} border-violet-400/40 bg-violet-500/[0.07]` : CELL_MODEL}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-violet-300/60">reading</span>
          {streaming && <Caret />}
        </div>
        {streaming && <p className={`${TEXT} mt-1`}>{turn.reading}</p>}
        {awaiting && (
          <textarea
            value={turn.reading}
            onChange={(e) => onEdit(turn.id, e.target.value)}
            rows={readingRows}
            aria-label="The model’s reading of your message — edit it before Go"
            className="mt-1 w-full resize-y rounded-xl border border-violet-400/30 bg-[#070b14] p-3 text-sm leading-relaxed text-gray-100 focus:border-violet-300/70 focus:outline-none"
          />
        )}
        {confirmed && <p className={`${TEXT} mt-1`}>{turn.reading}</p>}
        {failed && <p className="mt-1 text-sm text-amber-200/80">{turn.error ?? 'Did not finish.'}</p>}

        {!confirmed && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {awaiting && (
              <button
                type="button"
                onClick={() => onGo(turn.id)}
                disabled={answering || turn.reading.trim().length === 0}
                className="min-h-10 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Go
              </button>
            )}
            {streaming && (
              <button
                type="button"
                onClick={onStop}
                className="min-h-10 rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                Stop
              </button>
            )}
            {failed && (
              <button
                type="button"
                onClick={() => onRetryRead(turn.id)}
                className="min-h-10 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm text-gray-200 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
              >
                Again
              </button>
            )}
            <button
              type="button"
              onClick={() => onDrop(turn.id)}
              className="min-h-10 rounded-xl px-3 text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              drop
            </button>
            {awaiting && (
              <details className="basis-full">
                <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/70">elsewhere</summary>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={vendor}
                    onChange={(e) => onVendor(e.target.value as VendorId)}
                    aria-label="Which AI app to open"
                    className="rounded-lg border border-white/10 bg-gray-900 px-2 py-1.5 text-xs text-white"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                        {v.method === 'clipboard' ? ' (copies, then opens)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onHandoff(turn)}
                    className="min-h-9 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-gray-200 transition-colors hover:border-sky-400/40 hover:text-sky-200"
                  >
                    Open in {vendorLabel}
                  </button>
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Row 2: the reply — yours on the left, its own on the right */}
      {confirmed && (
        <>
          <div className={CELL_YOU}>
            {turn.rendered ? (
              <p className={TEXT}>
                {turn.rendered}
                {turn.replyStatus === 'rendering' && <Caret />}
              </p>
            ) : turn.replyStatus === 'streaming' || turn.replyStatus === 'rendering' ? (
              <Caret />
            ) : turn.replyStatus === 'error' && turn.reply ? (
              <>
                <p className={`${TEXT} text-gray-200`}>{turn.reply}</p>
                <p className="mt-1 font-mono text-[10px] text-amber-200/70">its words — yours did not finish</p>
              </>
            ) : turn.replyStatus === 'error' ? (
              <p className="text-sm text-amber-200/80">{turn.error}</p>
            ) : null}
            {turn.replyStatus === 'error' && isLast && (
              <button
                type="button"
                onClick={() => onAnswerAgain(turn.id)}
                disabled={answering}
                className="mt-2 min-h-9 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-gray-200 transition-colors hover:border-emerald-400/40 hover:text-emerald-200 disabled:opacity-40"
              >
                Answer again
              </button>
            )}
          </div>
          <div className={CELL_MODEL}>
            {turn.reply ? (
              <p className={TEXT}>
                {turn.reply}
                {turn.replyStatus === 'streaming' && <Caret />}
              </p>
            ) : (
              <Caret />
            )}
            {turn.engine && <p className="mt-2 font-mono text-[10px] text-white/35">{turn.engine}</p>}
          </div>
        </>
      )}
    </li>
  );
}

// ─── The instrument ──────────────────────────────────────────────────────────

interface BoardsOpen {
  you: boolean;
  model: boolean;
}

export default function Instrument() {
  const [text, setText] = useState('');
  const [you, setYou] = useRhat();
  const [model, setModel] = useModelRhat();
  const transcript = useTranscript();
  const turns = transcript.turns;
  const [vendor, setVendor] = useState<VendorId>('chatgpt');
  const [boards, setBoards] = useState<BoardsOpen>({ you: false, model: false });
  const [infoOpen, setInfoOpen] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [result, setResult] = useState<MirrorResult | null>(null);
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Generation counter: a stop, correction, drop, or clear makes any in-flight promise stale. */
  const genRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const infoId = useId();
  const mathId = useId();
  const youBoardId = useId();
  const modelBoardId = useId();

  const { profile: register } = useProfile();
  const copy = LANDING_COPY[register];
  const vendors = useMemo(() => listVendors(), []);

  // Debounced deterministic mirror — pure client-side, no network.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult(mirror(text)), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);

  // A new turn appears at the bottom — bring it into view.
  useEffect(() => {
    if (turns.length > 0) logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [turns.length]);

  const yours = useMemo(() => buildEquation(you), [you]);
  const theirs = useMemo(() => buildModelEquation(model), [model]);
  const yourWhy = useMemo(
    () => Object.fromEntries(yours.terms.map((t) => [t.key, t.why])) as Record<DialKey, string>,
    [yours],
  );
  const theirWhy = useMemo(
    () => Object.fromEntries(theirs.terms.map((t) => [t.key, t.why])) as Record<DialKey, string>,
    [theirs],
  );

  const pending = pendingTurn(turns);
  const readingLive = pending?.readingStatus === 'streaming';
  const answering = turns.some((t) => t.replyStatus === 'streaming' || t.replyStatus === 'rendering');
  const busy = readingLive || answering;

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

  const setYourFader = (key: DialKey, value: number) => setYou({ ...you, [key]: value } as ReceiverProfile);
  const setModelFader = (key: DialKey, value: number) => setModel({ ...model, [key]: value } as ReceiverProfile);

  const abortCurrent = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const resetComposer = () => {
    setText('');
    setLockedNote(null);
    setActiveSpan(null);
    setHandoffNote(null);
  };

  /** READ: the model rewrites your words as the prompt it would write to itself. */
  const runRead = async (id: string, words: string, previousReading: string | null, correction: string | null) => {
    abortCurrent();
    const gen = ++genRef.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const prior = contextFor(readTranscript().turns, id);
    updateTranscript((s) => patchTurn(s, id, { reading: '', readingStatus: 'streaming', edited: false, error: null }));
    setAnnounce(correction ? 'Re-reading with your correction.' : 'The model is reading your message.');
    try {
      await streamTranscript(
        { step: 'read', you: words, prior, previousReading, correction },
        (f) => {
          if (f.t === 'reading') updateTranscript((s) => appendField(s, id, 'reading', f.d));
          else if (f.t === 'error') throw new Error(f.message);
        },
        ctrl.signal,
      );
      if (genRef.current !== gen) return;
      updateTranscript((s) => patchTurn(s, id, { readingStatus: 'awaiting' }), { persist: true });
      setAnnounce('Reading ready. Go runs it; edit it or correct it first if you want.');
    } catch (e) {
      if (genRef.current !== gen) return; // stopped, corrected, or dropped — someone else owns the turn now
      const message = e instanceof Error ? e.message : 'Something went wrong — try again.';
      updateTranscript((s) => patchTurn(s, id, { readingStatus: 'error', error: message }), { persist: true });
      setAnnounce(message);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  };

  /** Your words → a new turn (or, while a reading waits, a correction to it). */
  const send = async () => {
    const words = text.trim();
    if (!words || answering) return;
    if (words.length > LIMITS.maxChars) {
      setAnnounce(`Too long — ${LIMITS.maxChars} characters at most.`);
      return;
    }
    if (pending) {
      await correct(words);
      return;
    }
    const id = makeId();
    updateTranscript((s) => ({ ...s, turns: [...s.turns, newTurn(id, words)] }));
    resetComposer();
    await runRead(id, words, null, null);
  };

  /** Your correction, in your words: the reading is re-derived with it attached. */
  const correct = async (words: string) => {
    const p = pendingTurn(readTranscript().turns);
    if (!p) return;
    const previous = p.reading.trim() || null;
    updateTranscript((s) => addCorrection(s, p.id, words), { persist: true });
    resetComposer();
    await runRead(p.id, p.you, previous, words);
  };

  /** Stop whatever is streaming. A partial reading stays editable; a partial answer becomes "answer again". */
  const stop = () => {
    const snap = readTranscript().turns;
    const p = pendingTurn(snap);
    const a = snap.find((t) => t.replyStatus === 'streaming' || t.replyStatus === 'rendering');
    genRef.current++;
    abortCurrent();
    if (p && p.readingStatus === 'streaming') {
      if (p.reading.trim()) {
        updateTranscript((s) => patchTurn(s, p.id, { readingStatus: 'awaiting' }), { persist: true });
        setAnnounce('Stopped. Edit the reading, correct it, or press Go.');
      } else {
        updateTranscript(
          (s) => patchTurn(s, p.id, { readingStatus: 'error', error: 'Stopped before anything arrived.' }),
          { persist: true },
        );
        setAnnounce('Stopped before anything arrived.');
      }
      return;
    }
    if (a) {
      updateTranscript((s) => patchTurn(s, a.id, { replyStatus: 'error', error: 'Stopped.' }), { persist: true });
      setAnnounce('Stopped.');
    }
  };

  /** GO: the reading — as shown, edits included — becomes the prompt the model runs. */
  const go = async (id: string) => {
    const t = readTranscript().turns.find((x) => x.id === id);
    if (!t) return;
    const readingText = t.reading.trim();
    if (!readingText || answering) return;
    abortCurrent();
    const gen = ++genRef.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    updateTranscript(
      (s) =>
        patchTurn(s, id, {
          reading: readingText,
          readingStatus: 'confirmed',
          replyStatus: 'streaming',
          reply: '',
          rendered: '',
          error: null,
          engine: null,
        }),
      { persist: true },
    );
    const snap = readTranscript().turns;
    const prior = contextFor(snap, id);
    const samples = registerSample(snap);
    setAnnounce('Answering.');
    try {
      await streamTranscript(
        { step: 'answer', reading: readingText, prior, you, model, samples },
        (f) => {
          if (f.t === 'reply') updateTranscript((s) => appendField(s, id, 'reply', f.d));
          else if (f.t === 'rendered')
            updateTranscript((s) => {
              const cur = s.turns.find((x) => x.id === id);
              const next = cur && cur.replyStatus !== 'rendering' ? patchTurn(s, id, { replyStatus: 'rendering' }) : s;
              return appendField(next, id, 'rendered', f.d);
            });
          else if (f.t === 'done') updateTranscript((s) => patchTurn(s, id, { engine: f.engine }));
          else if (f.t === 'error') throw new Error(f.message);
        },
        ctrl.signal,
      );
      if (genRef.current !== gen) return;
      updateTranscript((s) => patchTurn(s, id, { replyStatus: 'done' }), { persist: true });
      setAnnounce('Answer ready.');
    } catch (e) {
      if (genRef.current !== gen) return;
      const message = ctrl.signal.aborted ? 'Stopped.' : e instanceof Error ? e.message : 'Something went wrong — try again.';
      updateTranscript((s) => patchTurn(s, id, { replyStatus: 'error', error: message }), { persist: true });
      setAnnounce(message);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  };

  const editReading = (id: string, value: string) => {
    updateTranscript((s) => patchTurn(s, id, { reading: value, edited: true }));
  };

  const drop = (id: string) => {
    genRef.current++;
    abortCurrent();
    updateTranscript((s) => removeTurn(s, id), { persist: true });
    setAnnounce('Dropped.');
  };

  const retryRead = (id: string) => {
    const t = readTranscript().turns.find((x) => x.id === id);
    if (!t) return;
    void runRead(id, t.you, null, null);
  };

  const clearAll = () => {
    genRef.current++;
    abortCurrent();
    clearTranscript();
    setHandoffNote(null);
    setAnnounce('Cleared.');
  };

  /** The zero-cost exit: the reading, with both boards, into the visitor's own app. */
  const handoff = async (turn: Turn) => {
    const payload = buildPayload(turn.reading, you, model);
    const h = buildHandoff(vendor, payload);
    if (h.method === 'clipboard' && h.clipboardText !== null) {
      try {
        await navigator.clipboard.writeText(h.clipboardText);
      } catch {
        /* clipboard can be denied — the instruction line still says what to do */
      }
    }
    setHandoffNote(h.instructions);
    window.open(h.url, '_blank', 'noopener,noreferrer');
  };

  const onTextChange = (v: string) => {
    setText(v);
    setLockedNote(null);
    setActiveSpan(null);
    setHandoffNote(null);
  };

  const toggleBoard = (which: keyof BoardsOpen) => {
    setBoards((b) => ({ ...b, [which]: !b[which] }));
    setInfoOpen(false);
  };
  const toggleInfo = () => {
    setInfoOpen((o) => !o);
  };

  const anyBoard = boards.you || boards.model;

  return (
    <section id="box" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-8 sm:px-6" aria-label="The instrument">
      <h1 className="text-sm font-semibold tracking-tight text-white/70 sm:text-base">{BRAND_PROMISE}</h1>

      {/* ── Column heads ───────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <h2 className="px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-sky-300/80">You</h2>
        <h2
          className="hidden px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-violet-300/80 md:block"
          title="The model’s context window — what it is actually run on"
        >
          The model
        </h2>
      </div>

      {/* ── The conversation, two registers, aligned turn by turn ─────────── */}
      <div role="log" aria-label="The conversation, in two registers" aria-live="polite" aria-relevant="additions text" className="mt-2">
        {turns.length > 0 && (
          <ol className="space-y-4">
            {turns.map((t, i) => (
              <TurnRow
                key={t.id}
                turn={t}
                isLast={i === turns.length - 1}
                answering={answering}
                vendors={vendors}
                vendor={vendor}
                onVendor={setVendor}
                onGo={(id) => void go(id)}
                onStop={stop}
                onDrop={drop}
                onEdit={editReading}
                onRetryRead={retryRead}
                onAnswerAgain={(id) => void go(id)}
                onHandoff={(turn) => void handoff(turn)}
              />
            ))}
          </ol>
        )}
        <div ref={logEndRef} />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* ── The text box, with its options collapsed in the toolbar ───────── */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0f1a] p-3">
        {/* Options, opened from the toolbar */}
        {anyBoard && (
          <div className={`mb-3 grid gap-3 ${boards.you && boards.model ? 'md:grid-cols-2' : ''}`}>
            {boards.you && (
              <div id={youBoardId} className="rounded-2xl border border-white/10 bg-[#070b14] p-3">
                <FaderBoard
                  side="you"
                  title="Your board"
                  accent={ACCENT_YOU}
                  dials={DIALS}
                  profile={you}
                  why={yourWhy}
                  vector={yours.vector}
                  onChange={setYourFader}
                  footer={
                    <Link href="/calibrate" className="inline-flex min-h-9 items-center underline-offset-4 hover:text-white hover:underline">
                      Set it by answering five questions →
                    </Link>
                  }
                />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/70">what it does to replies</summary>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">{yours.instruction}</p>
                </details>
              </div>
            )}
            {boards.model && (
              <div id={modelBoardId} className="rounded-2xl border border-white/10 bg-[#070b14] p-3">
                <FaderBoard
                  side="model"
                  title="The model's board"
                  accent={ACCENT_MODEL}
                  dials={MODEL_DIALS}
                  profile={model}
                  why={theirWhy}
                  vector={theirs.vector}
                  extra={`regime: ${theirs.regime}`}
                  onChange={setModelFader}
                  presets={MODEL_PRESETS}
                  onPreset={(p) => setModel(p)}
                  footer={
                    <Link href="/tuner" className="inline-flex min-h-9 items-center underline-offset-4 hover:text-white hover:underline">
                      Derive it from a workload description →
                    </Link>
                  }
                />
                <p className="mt-2 break-words font-mono text-[11px] text-white/45">
                  applied to the call: temperature {theirs.params.temperature} · top_p {theirs.params.top_p} · max_tokens{' '}
                  {theirs.params.max_tokens}
                </p>
                <button
                  type="button"
                  onClick={() => setShowMath((s) => !s)}
                  aria-expanded={showMath}
                  aria-controls={mathId}
                  className="mt-1 min-h-9 text-[11px] underline-offset-4 hover:underline"
                  style={{ color: ACCENT_MODEL }}
                >
                  {showMath ? 'hide the math' : 'the math'}
                </button>
                {showMath && (
                  <div id={mathId} className="mt-2 rounded-xl border border-white/8 bg-[#0a0f1a] p-3">
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-white/70">
                      {theirs.lines.join('\n')}
                    </pre>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/50">stance, in the system prompt: {theirs.stance}</p>
                    <p className="mt-1 text-[11px] text-white/40">
                      context, tool-use, and retry strategies are derived and listed but do nothing in a plain chat.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {infoOpen && (
          <div
            id={infoId}
            role="region"
            aria-label="What this is doing"
            className="mb-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 text-sm leading-relaxed text-white/75"
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
            <p className="mt-3 font-semibold text-white">The two boards</p>
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

        {/* The text */}
        <div className="relative rounded-xl border border-white/10 bg-[#070b14] focus-within:border-emerald-400/50">
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
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void send();
              }
            }}
            onScroll={(e) => {
              if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
            placeholder={pending ? 'Correct it, or press Go' : 'Say it your way…'}
            rows={4}
            aria-label={pending ? 'Your correction, in your words' : 'Your words'}
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
          <div className="mt-2 flex flex-wrap gap-2" data-testid="chip-strip">
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
        )}

        {lockedNote && (
          <p className="mt-2 text-xs text-emerald-400" role="status">
            {lockedNote}
          </p>
        )}

        {/* Empty state — three examples, no words */}
        {text.trim().length === 0 && turns.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-2" data-testid="empty-state">
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
        )}

        {/* Toolbar — the options, collapsed */}
        <div className="mt-2 flex items-center gap-1">
          <ToolButton
            label="Your board"
            active={boards.you}
            controls={youBoardId}
            accent={ACCENT_YOU}
            dot={!profilesEqual(you, NEUTRAL_PROFILE)}
            onClick={() => toggleBoard('you')}
          >
            <SlidersGlyph color={ACCENT_YOU} />
          </ToolButton>
          <ToolButton
            label="The model's board"
            active={boards.model}
            controls={modelBoardId}
            accent={ACCENT_MODEL}
            dot={!profilesEqual(model, NEUTRAL_PROFILE)}
            onClick={() => toggleBoard('model')}
          >
            <SlidersGlyph color={ACCENT_MODEL} />
          </ToolButton>
          <button
            type="button"
            onClick={toggleInfo}
            aria-label="What is this doing?"
            title="What is this doing?"
            aria-expanded={infoOpen}
            aria-controls={infoId}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border font-mono text-[12px] text-sky-200 transition-colors ${
              infoOpen ? 'border-white/25 bg-white/[0.08]' : 'border-transparent hover:border-white/15 hover:bg-white/[0.04]'
            }`}
          >
            <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/60">
              i
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {busy && (
              <button
                type="button"
                onClick={stop}
                className="min-h-10 rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={text.trim().length === 0 || answering}
              title="Ctrl/⌘ + Enter"
              className="min-h-10 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? 'Correct' : 'Send'}
            </button>
          </div>
        </div>

        {/* What leaves your machine — one line, the rest folded */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/70">
              Your words go to the model. Nothing is stored here.
            </summary>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">{WHAT_LEAVES}</p>
          </details>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="min-h-9 text-[11px] text-white/40 underline-offset-4 hover:text-amber-200 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {handoffNote && (
          <p className="mt-1 text-xs text-white/60" role="status">
            {handoffNote}
          </p>
        )}
      </div>
    </section>
  );
}
