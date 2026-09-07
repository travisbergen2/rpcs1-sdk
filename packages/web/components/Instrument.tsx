'use client';

/**
 * Instrument — the homepage IS the tool: one conversation in two registers.
 *
 * Two panes, each with its own board on top, mixing-desk style:
 *   YOU        — your five faders (the receiver profile R̂) above your side of
 *                the conversation: your words as typed (with the deterministic
 *                fork squiggles while you type), and every reply re-rendered
 *                in your words. That rendering IS the reply you read.
 *   THE MODEL  — its five faders (the same primitives read as an agent
 *                configuration) above its context window, made visible: your
 *                message as the model rewrites it for itself — streamed live,
 *                stoppable, editable, correctable; nothing runs until Go — and
 *                its reply in its own words, with the model's name under it.
 *
 * Rows are aligned turn by turn, so the model's words are one glance away
 * from yours. Both boards are applied for real (lib/transcript.ts): the
 * model's sets the call's parameters and stance, yours governs the
 * re-rendering. What leaves the machine is stated under the conversation
 * (WHAT_LEAVES); the transcript lives in this browser only.
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
  buildEquation,
  buildModelEquation,
  buildPayload,
  hear,
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

// ─── One turn, two registers ─────────────────────────────────────────────────

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
  const readingRows = Math.min(14, Math.max(3, turn.reading.split('\n').length + 1));
  const vendorLabel = vendors.find((v) => v.id === vendor)?.label ?? 'your AI app';

  const readingChip = streaming
    ? 'reading…'
    : awaiting
      ? `waiting for your Go${turn.edited ? ' · edited' : ''}${turn.corrections.length ? ` · corrected ×${turn.corrections.length}` : ''}`
      : confirmed
        ? `ran as shown${turn.edited ? ' · edited by you' : ''}`
        : 'did not finish';

  const replyChip =
    turn.replyStatus === 'streaming'
      ? 'answering…'
      : turn.replyStatus === 'rendering'
        ? 'answered · rendering yours…'
        : turn.replyStatus === 'done'
          ? turn.engine
            ? `answered by ${turn.engine}`
            : 'answered'
          : turn.replyStatus === 'error'
            ? turn.error ?? 'did not finish'
            : '';

  return (
    <li className="grid gap-3 md:grid-cols-2" data-turn={turn.id}>
      {/* Left: you */}
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.05] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-sky-300/70">You</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">{turn.you}</p>
          {turn.corrections.map((c, i) => (
            <div key={i} className="mt-2 border-l-2 border-sky-400/40 pl-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sky-300/60">correction {i + 1}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">{c}</p>
            </div>
          ))}
        </div>

        {confirmed && (
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">Reply · in your words</p>
              <p className="text-[10px] text-white/35">
                {turn.replyStatus === 'done' ? 'meaning held, wording yours' : ''}
              </p>
            </div>
            {turn.rendered ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">
                {turn.rendered}
                {turn.replyStatus === 'rendering' && <Caret />}
              </p>
            ) : turn.replyStatus === 'streaming' ? (
              <p className="mt-1 text-sm text-white/40">Answering — its own words are arriving on the right; yours follow.</p>
            ) : turn.replyStatus === 'rendering' ? (
              <p className="mt-1 text-sm text-white/40">
                Rendering into your words…
                <Caret />
              </p>
            ) : turn.replyStatus === 'error' && turn.reply ? (
              <>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">{turn.reply}</p>
                <p className="mt-1 text-[11px] text-amber-200/80">
                  Shown in the model’s words — re-rendering into yours did not finish.
                </p>
              </>
            ) : turn.replyStatus === 'error' ? (
              <p className="mt-1 text-sm text-amber-200/80">{turn.error}</p>
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
        )}
      </div>

      {/* Right: the model */}
      <div className="flex flex-col gap-2">
        <div
          className={`rounded-2xl border p-3 ${
            awaiting ? 'border-violet-400/40 bg-violet-500/[0.07]' : 'border-violet-400/20 bg-violet-500/[0.04]'
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-violet-300/70">As the model reads it</p>
            <p className="text-[10px] text-white/40" role="status">
              {readingChip}
            </p>
          </div>

          {streaming && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">
              {turn.reading}
              <Caret />
            </p>
          )}
          {awaiting && (
            <textarea
              value={turn.reading}
              onChange={(e) => onEdit(turn.id, e.target.value)}
              rows={readingRows}
              aria-label="The model’s reading of your message — edit it before Go"
              className="mt-1 w-full resize-y rounded-xl border border-violet-400/30 bg-[#070b14] p-3 text-sm leading-relaxed text-gray-100 focus:border-violet-300/70 focus:outline-none"
            />
          )}
          {confirmed && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">{turn.reading}</p>
          )}
          {turn.readingStatus === 'error' && (
            <p className="mt-1 text-sm text-amber-200/80">{turn.error ?? 'The reading did not finish.'}</p>
          )}

          {(streaming || awaiting || turn.readingStatus === 'error') && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {awaiting && (
                <button
                  type="button"
                  onClick={() => onGo(turn.id)}
                  disabled={answering || turn.reading.trim().length === 0}
                  className="min-h-10 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Go — run it as shown
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
              {turn.readingStatus === 'error' && (
                <button
                  type="button"
                  onClick={() => onRetryRead(turn.id)}
                  className="min-h-10 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm text-gray-200 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
                >
                  Read it again
                </button>
              )}
              <button
                type="button"
                onClick={() => onDrop(turn.id)}
                className="min-h-10 rounded-xl px-3 text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
              >
                Drop this message
              </button>
              {awaiting && (
                <p className="basis-full text-[11px] text-white/45">
                  Edit it here, or type a correction below in your own words. Nothing runs until Go.
                </p>
              )}
            </div>
          )}

          {awaiting && (
            <details className="mt-2 border-t border-white/8 pt-2">
              <summary className="cursor-pointer text-[11px] text-white/45 hover:text-white/70">
                Or take this reading to your own app instead
              </summary>
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
                  Open in {vendorLabel} with both boards
                </button>
              </div>
            </details>
          )}
        </div>

        {confirmed && (
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">Reply · in its words</p>
              <p className="text-[10px] text-white/35" role="status">
                {replyChip}
              </p>
            </div>
            {turn.reply ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">
                {turn.reply}
                {turn.replyStatus === 'streaming' && <Caret />}
              </p>
            ) : turn.replyStatus === 'streaming' ? (
              <p className="mt-1 text-sm text-white/40">
                Answering…
                <Caret />
              </p>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

// ─── The instrument ──────────────────────────────────────────────────────────

export default function Instrument() {
  const [text, setText] = useState('');
  const [you, setYou] = useRhat();
  const [model, setModel] = useModelRhat();
  const transcript = useTranscript();
  const turns = transcript.turns;
  const [vendor, setVendor] = useState<VendorId>('chatgpt');
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
  const hearing = useMemo(() => hear(text, you), [text, you]);
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
    setAnnounce(correction ? 'Re-reading with your correction…' : 'The model is reading your message…');
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
      setAnnounce('Reading ready — press Go to run it, edit it, or correct it below.');
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
        setAnnounce('Stopped. Edit the reading, correct it below, or press Go.');
      } else {
        updateTranscript(
          (s) => patchTurn(s, p.id, { readingStatus: 'error', error: 'Stopped before anything arrived — read it again or drop it.' }),
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
    setAnnounce('Running the reading — answering…');
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
      setAnnounce('Answer ready — in your words on the left, the model’s own on the right.');
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
    setAnnounce('Conversation cleared.');
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

  const sendLabel = pending ? 'Correct the reading' : 'Send';
  const placeholder = pending
    ? 'Not what you meant? Say so here, your way — it redoes the reading.'
    : 'Say it your way…';

  return (
    <section id="box" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-8 sm:px-6" aria-label="The instrument">
      {/* ── Header: promise, info bubble ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm font-semibold tracking-tight text-white/80 sm:text-base">{BRAND_PROMISE}</h1>
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

      {/* ── The two boards ─────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              Set this board by answering five questions →
            </Link>
          }
        />
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
              Derive this board from a workload description →
            </Link>
          }
        />
      </div>

      {/* ── The conversation: two registers, aligned turn by turn ──────────── */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-300/80">You</h2>
          <span className="text-[11px] text-white/35">in your words</span>
        </div>
        <div className="hidden items-baseline justify-between px-1 md:flex">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-300/80">The model’s context window</h2>
          <span className="text-[11px] text-white/35">what it actually holds</span>
        </div>
      </div>

      <div
        role="log"
        aria-label="The conversation, in two registers"
        aria-live="polite"
        aria-relevant="additions text"
        className="mt-2"
      >
        {turns.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2" data-testid="empty-transcript">
            <div className="rounded-2xl border border-dashed border-sky-400/20 p-4 text-sm text-white/40">
              Your side of the conversation: what you type, and every answer put in your words.
            </div>
            <div className="rounded-2xl border border-dashed border-violet-400/20 p-4 text-sm text-white/40">
              The model’s context window: before it answers, it rewrites your message as the prompt it would write to
              itself — you see it, you can stop or correct it, and only what you release runs. Its answers appear here
              in its own words.
            </div>
          </div>
        ) : (
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

      {/* ── The composer, and what your words become before you send ──────── */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Left: your words */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
              {pending ? 'Correct the reading' : 'Your next message'}
            </h2>
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
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void send();
                }
              }}
              onScroll={(e) => {
                if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              placeholder={placeholder}
              rows={5}
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
          {text.trim().length === 0 && !pending && (
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

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void send()}
              disabled={text.trim().length === 0 || answering}
              className="min-h-11 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendLabel}
            </button>
            {busy && (
              <button
                type="button"
                onClick={stop}
                className="min-h-11 rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
              >
                Stop
              </button>
            )}
            <span className="text-[11px] text-white/40">Ctrl/⌘ + Enter sends</span>
          </div>
        </div>

        {/* Right: before you send, and what both boards do to the call */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Before you send</h2>
            <span className="text-[11px] text-white/35">no model yet</span>
          </div>

          <div className="mt-3 space-y-3 text-sm">
            {pending ? (
              <p className="text-white/50">
                The model’s reading of your last message is above, waiting. Go runs it as shown; editing it there changes
                what runs; typing here corrects it in your own words.
              </p>
            ) : hearing === null ? (
              <p className="text-white/35">Nothing yet — type on the left. The engine’s parse shows here before anything is sent.</p>
            ) : (
              <>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">The engine’s parse</p>
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
                  On Send the model itself reads it — its rewrite streams into its pane above, and you decide what runs.
                </p>
              </>
            )}

            <div className="border-t border-white/8 pt-3">
              <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: ACCENT_YOU }}>
                How replies are rendered to you — from your board
              </p>
              <p className="mt-1 leading-relaxed text-white/75">{yours.instruction}</p>
            </div>

            <div className="border-t border-white/8 pt-3">
              <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: ACCENT_MODEL }}>
                How it runs — from its board, applied to the call
              </p>
              <p className="mt-1 leading-relaxed text-white/75">{theirs.stance}</p>
              <p className="mt-1 break-words font-mono text-[11px] text-white/45">{theirs.settingsLine}</p>
              <button
                type="button"
                onClick={() => setShowMath((s) => !s)}
                aria-expanded={showMath}
                aria-controls={mathId}
                className="mt-1 min-h-9 text-[11px] underline-offset-4 hover:underline"
                style={{ color: ACCENT_MODEL }}
              >
                {showMath ? 'Hide the math' : 'Show the math'}
              </button>
              {showMath && (
                <div id={mathId} className="mt-2 rounded-xl border border-white/8 bg-[#070b14] p-3">
                  <p className="text-[11px] text-white/45">
                    The model board&apos;s five numbers through the engine&apos;s mapping (generic platform ranges). This
                    page is the app, so temperature, top_p, and max_tokens are the actual parameters of the answering
                    call and the stance sentences are its system prompt; context, tool-use, and retry strategies are
                    derived and shown but do nothing in a plain chat. Each line states the rule and the value it
                    produced; the rules are checked against the engine in the test suite.
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-white/70">
                    {theirs.lines.join('\n')}
                  </pre>
                  <p className="mt-2 font-mono text-[11px] text-white/40">
                    your board&apos;s band rule: value &lt; 40 → low · 40–60 → mid · value &gt; 60 → high
                    {hearing ? ` · commit-vs-clarify level: ${hearing.arLevel}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── What leaves your machine ───────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/45">{WHAT_LEAVES}</p>
        <button
          type="button"
          onClick={clearAll}
          disabled={turns.length === 0}
          className="min-h-9 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-gray-300 transition-colors hover:border-amber-400/40 hover:text-amber-200 disabled:opacity-40"
        >
          Clear the conversation
        </button>
        {handoffNote && (
          <p className="basis-full text-xs text-white/60" role="status">
            {handoffNote}
          </p>
        )}
      </div>
    </section>
  );
}
