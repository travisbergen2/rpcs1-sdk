'use client';

/**
 * The Loop — Phase A hero surface (Explicit Formula one-product consolidation,
 * 2026-08-22 spec).
 *
 * Flow: brain dump → the model's precise reading, shown as tappable lines,
 * with the original always visible beside it → the user locks the lines that
 * read right → "redo the rest" re-derives only the unlocked remainder (locked
 * lines are enforced verbatim by the core ratchet — mechanically, never by
 * trust) → repeat to convergence → copy the finished prompt anywhere, or
 * answer it here.
 *
 * Consumer copy stays outcome-first (house naming rule): "lines" and "lock",
 * never spans/ratchet/parameters.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  clampResponseDelay,
  dictationHint,
  normalizeNotes,
  normalizeTextScale,
  paceMs,
  TEXT_SCALE_FACTORS,
} from '@/lib/loop-prefs';
import { composeAccommodationRecord } from '@/lib/accommodation';
import {
  getCoarseServerSnapshot,
  getCoarseSnapshot,
  getPrefsServerSnapshot,
  getPrefsSnapshot,
  subscribeCoarse,
  subscribePrefs,
  updateLoopPrefs,
} from '@/lib/loop-prefs-store';
import {
  CURRENT_ID,
  defaultDraftStore,
  makeDraftAutosaver,
  saveOfflineDump,
  type Draft,
  type DraftStore,
} from '@/lib/offline-drafts';
import { evaluateSeries, GAUGE_STRINGS, l1Score } from '@/lib/gauge';
import { GaugeBadge } from '@/components/GaugeBadge';

/**
 * M4 feature flag — the gauge badge ships DEFAULT OFF; enable by setting
 * NEXT_PUBLIC_EF_GAUGE=1 at build time. License: E-SYC-1 PASS-SYNTHETIC
 * (Tier S1, 2026-08-29). Honest surface note: loop sessions rarely reach the
 * 8-reply warmup, so on this surface the badge mostly reports 'watching' —
 * its full value arrives on longer-conversation surfaces.
 */
const GAUGE_ON = process.env.NEXT_PUBLIC_EF_GAUGE === '1';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface UiSpan {
  id: string;
  text: string;
  status: 'kept' | 'revised';
}

type Stage = 'input' | 'rounds' | 'final';

interface LoopApiResponse {
  spans?: UiSpan[];
  repaired?: boolean;
  violations?: string[];
  engine?: string;
  error?: string;
  message?: string;
}

export default function LoopPage() {
  const [stage, setStage] = useState<Stage>('input');
  const [dump, setDump] = useState('');
  const [spans, setSpans] = useState<UiSpan[]>([]);
  const [elected, setElected] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(0);
  const [held, setHeld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // M2: accessibility prefs, screen-reader announcements, offline drafts.
  // Prefs + pointer type ride useSyncExternalStore (the house pattern —
  // localStorage/media query as external stores; no set-state-in-effect).
  const prefs = useSyncExternalStore(subscribePrefs, getPrefsSnapshot, getPrefsServerSnapshot);
  const coarse = useSyncExternalStore(subscribeCoarse, getCoarseSnapshot, getCoarseServerSnapshot);
  const [announce, setAnnounce] = useState('');
  const [restorable, setRestorable] = useState<Draft | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  /** M4: per-session L1 scores of in-app answers (client-side only). */
  const [answerScores, setAnswerScores] = useState<number[]>([]);
  const prefsRef = useRef(prefs);
  const storeRef = useRef<DraftStore | null>(null);
  const autosaveRef = useRef<((text: string) => void) | null>(null);
  const dumpRef = useRef<HTMLTextAreaElement | null>(null);
  const roundsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const finalHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Screen-reader focus management: each stage swap unmounts the control the
  // user just activated, which would silently drop focus to <body>. Move it
  // to the new stage's heading (input stage: back into the dump box).
  // Guarded against the initial mount — autofocusing on page load would
  // steal focus from the top of the document and bypass the skip link.
  const stageMounted = useRef(false);
  useEffect(() => {
    if (!stageMounted.current) {
      stageMounted.current = true;
      return;
    }
    if (stage === 'rounds') roundsHeadingRef.current?.focus();
    else if (stage === 'final') finalHeadingRef.current?.focus();
    else if (stage === 'input') dumpRef.current?.focus();
  }, [stage]);

  // M2 mount: open the draft store and surface the newest recoverable draft
  // (setState here happens only in the async subscription callback — the
  // sanctioned "external system reports back" shape).
  useEffect(() => {
    const store = defaultDraftStore();
    storeRef.current = store;
    autosaveRef.current = makeDraftAutosaver(store);
    let cancelled = false;
    void store.list().then((drafts) => {
      if (!cancelled && drafts.length > 0) setRestorable(drafts[0]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const finalPrompt = useMemo(
    () => spans.map((s) => s.text.trim()).filter(Boolean).join(' '),
    [spans],
  );

  const callLoop = useCallback(
    async (body: Record<string, unknown>): Promise<LoopApiResponse | null> => {
      setBusy(true);
      setError(null);
      const t0 = Date.now();
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tool: 'loop', ...body }),
        });
        const data = (await res.json()) as LoopApiResponse;
        if (!res.ok || !data.spans) {
          setError(data.message || 'Something went wrong — try again.');
          return null;
        }
        // Response pacing (accommodation): a FLOOR on time-to-render, never
        // an addend — a slow network already counts toward it.
        await sleep(paceMs(prefsRef.current.responseDelayMs, Date.now() - t0));
        return data;
      } catch {
        setError('Network hiccup — try again.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const firstRound = useCallback(async () => {
    if (!dump.trim()) return;
    setOfflineSaved(false);
    const data = await callLoop({ text: dump });
    if (!data?.spans) {
      // Offline send: the dump is too valuable to lose — preserve it durably.
      // Nothing auto-sends later; interpretation only runs on the user's tap.
      if (typeof navigator !== 'undefined' && !navigator.onLine && storeRef.current) {
        await saveOfflineDump(storeRef.current, dump);
        setError(null);
        setOfflineSaved(true);
        setAnnounce("You're offline — your dump is saved on this device and will be here when you're back.");
      }
      return;
    }
    setSpans(data.spans);
    setElected(new Set());
    setRound(1);
    setHeld(false);
    setStage('rounds');
    setAnnounce(`Interpretation ready — ${data.spans.length} lines.`);
    void storeRef.current?.remove(CURRENT_ID);
  }, [dump, callLoop]);

  const nextRound = useCallback(async () => {
    const data = await callLoop({
      text: dump,
      spans,
      electedIds: Array.from(elected),
    });
    if (!data?.spans) return;
    setSpans(data.spans);
    // Locked lines survive verbatim — re-elect them by matching text so the
    // user's locks visibly persist across rounds.
    const lockedTexts = new Set(
      spans.filter((s) => elected.has(s.id)).map((s) => s.text),
    );
    setElected(new Set(data.spans.filter((s) => lockedTexts.has(s.text)).map((s) => s.id)));
    setRound((r) => r + 1);
    setHeld(Boolean(data.repaired));
    setAnnounce(
      `Round ${round + 1} — lines updated.` +
        (data.repaired ? ' Your locked lines were held in place.' : ''),
    );
  }, [dump, spans, elected, round, callLoop]);

  const toggle = useCallback((id: string) => {
    setElected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the text is selectable below.
    }
  }, [finalPrompt]);

  const answerHere = useCallback(async () => {
    setAnswerBusy(true);
    setError(null);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tool: 'loop_answer', prompt: finalPrompt }),
      });
      const data = (await res.json()) as { answer?: string; message?: string };
      if (!res.ok || !data.answer) {
        setError(data.message || 'Could not answer here — copy the prompt into your own AI.');
        return;
      }
      await sleep(paceMs(prefsRef.current.responseDelayMs, Date.now() - t0));
      setAnswer(data.answer);
      if (GAUGE_ON) {
        const nextScores = [...answerScores, l1Score(data.answer)];
        setAnswerScores(nextScores);
        const reading = evaluateSeries(nextScores);
        setAnnounce(
          reading.state === 'flagged'
            ? `Answer ready. ${GAUGE_STRINGS.flagged}`
            : 'Answer ready.',
        );
      } else {
        setAnnounce('Answer ready.');
      }
    } catch {
      setError('Network hiccup — copy the prompt into your own AI.');
    } finally {
      setAnswerBusy(false);
    }
  }, [finalPrompt, answerScores]);

  // M3: the accommodation record — user-configured settings + their own
  // words, downloadable as a file to attach to a request. Nothing else.
  const exportRecord = useCallback(() => {
    const md = composeAccommodationRecord(prefs, {
      surface: 'explicitformula.com web app',
      date: new Date().toISOString().slice(0, 10),
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accommodation-record.md';
    a.click();
    URL.revokeObjectURL(url);
    setAnnounce('Accommodation record downloaded.');
  }, [prefs]);

  const reset = useCallback(() => {
    setStage('input');
    setSpans([]);
    setElected(new Set());
    setRound(0);
    setHeld(false);
    setError(null);
    setAnswer(null);
  }, []);

  return (
    // NOTE: a <div>, not <main> — the root layout already provides the single
    // <main id="main"> landmark (duplicate main landmarks fail axe).
    <div
      className="mx-auto max-w-5xl px-6 py-12"
      // Panel-local text scale (M2 accommodation): CSS zoom scales this page
      // only — the rest of the site and the user's browser zoom are untouched.
      style={{ zoom: TEXT_SCALE_FACTORS[prefs.textScale] }}
    >
      {/* Persistent polite live region — mounted once for the whole page and
          text-swapped, so screen readers actually announce round completions
          across stage changes (a region remounted per stage never announces). */}
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Say it once. Make sure it landed.
          </h1>
          <details className="relative text-sm">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-neutral-600 px-3 py-2 opacity-80 transition hover:opacity-100">
              Display &amp; pacing
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-neutral-700 bg-neutral-950 p-4 shadow-xl">
              <label className="block text-xs uppercase tracking-wide opacity-60" htmlFor="ef-text-size">
                Text size (this page)
              </label>
              <select
                id="ef-text-size"
                value={prefs.textScale}
                onChange={(e) => updateLoopPrefs({ ...prefs, textScale: normalizeTextScale(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2"
              >
                <option value="default">Default</option>
                <option value="large">Large</option>
                <option value="larger">Larger</option>
              </select>
              <label className="mt-4 block text-xs uppercase tracking-wide opacity-60" htmlFor="ef-pacing">
                Response pacing
              </label>
              <select
                id="ef-pacing"
                value={String(prefs.responseDelayMs)}
                onChange={(e) => updateLoopPrefs({ ...prefs, responseDelayMs: clampResponseDelay(Number(e.target.value)) })}
                className="mt-1 w-full rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2"
              >
                <option value="0">Instant</option>
                <option value="1000">After 1 second</option>
                <option value="2000">After 2 seconds</option>
              </select>
              <p className="mt-2 text-xs opacity-60">
                A minimum time before results appear — slow connections already count toward it.
              </p>
              <label className="mt-4 block text-xs uppercase tracking-wide opacity-60" htmlFor="ef-notes">
                Accommodation notes
              </label>
              <textarea
                id="ef-notes"
                value={prefs.notes}
                maxLength={2000}
                onChange={(e) => updateLoopPrefs({ ...prefs, notes: normalizeNotes(e.target.value) })}
                placeholder="Your own words about what you need — included in the download below."
                className="mt-1 h-24 w-full resize-y rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
              />
              <button
                onClick={exportRecord}
                className="mt-3 min-h-11 w-full rounded-lg border border-neutral-400 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                Download accommodation record
              </button>
              <p className="mt-1 text-xs opacity-60">
                Your settings + your notes as a file to attach to an accommodation request.
                Nothing else is included.
              </p>
            </div>
          </details>
        </div>
        <p className="mt-2 max-w-2xl text-base opacity-80">
          Brain-dump what you want. See exactly what the AI heard. Lock the
          lines it got right — it redoes only the rest. When it finally reads
          like your own thought, send it.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {stage === 'input' && (
        <section>
          {offlineSaved && (
            <p role="status" className="mb-3 rounded-lg border border-sky-500/50 bg-sky-950/40 px-4 py-3 text-sm text-sky-200">
              You&apos;re offline — your dump is saved on this device. It&apos;ll be here when
              you&apos;re back.
            </p>
          )}
          {restorable && !dump && (
            <button
              onClick={() => {
                setDump(restorable.text);
                void storeRef.current?.remove(restorable.id);
                setRestorable(null);
                dumpRef.current?.focus();
              }}
              className="mb-3 inline-flex min-h-11 items-center rounded-lg border border-neutral-600 px-3 py-2 text-sm opacity-80 transition hover:opacity-100"
            >
              Pick up where you left off ({new Date(restorable.savedAt).toLocaleString()})
            </button>
          )}
          <textarea
            ref={dumpRef}
            value={dump}
            onChange={(e) => {
              setDump(e.target.value);
              autosaveRef.current?.(e.target.value);
            }}
            placeholder="Dump it here exactly how it comes out — half-sentences, tangents, all of it."
            aria-label="Brain dump — what you want to say"
            className="h-56 w-full resize-y rounded-xl border border-neutral-500 bg-white/5 p-4 text-base leading-relaxed text-inherit outline-none placeholder:opacity-50 focus:border-amber-400"
            maxLength={8000}
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={firstRound}
              disabled={busy || !dump.trim()}
              className="min-h-11 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-amber-400 disabled:opacity-40"
            >
              {busy ? 'Reading…' : 'Show me what it heard'}
            </button>
            <span className="text-xs opacity-60">{dump.length}/8000</span>
          </div>
          {dictationHint(coarse) && (
            <p className="mt-2 text-xs opacity-60">{dictationHint(coarse)}</p>
          )}
        </section>
      )}

      {stage === 'rounds' && (
        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-60">
              What you said
            </h2>
            <div className="whitespace-pre-wrap rounded-xl border border-neutral-700 bg-white/5 p-4 text-sm leading-relaxed opacity-80">
              {dump}
            </div>
          </div>
          <div>
            <h2
              ref={roundsHeadingRef}
              tabIndex={-1}
              className="mb-2 text-sm font-medium uppercase tracking-wide opacity-60 outline-none"
            >
              What it heard — tap the lines that are right
            </h2>
            {held && (
              <p role="status" className="mb-2 rounded-md bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200">
                Your locked lines were held in place.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {spans.map((s) => {
                const locked = elected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={
                      'min-h-11 rounded-lg border px-3 py-2 text-left text-sm leading-relaxed transition ' +
                      (locked
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100'
                        : 'border-neutral-500 bg-transparent hover:border-neutral-300')
                    }
                    aria-pressed={locked}
                  >
                    {locked ? <span aria-hidden>{'✓ '}</span> : null}
                    {s.text}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={nextRound}
                disabled={busy || elected.size === 0 || elected.size === spans.length}
                className="min-h-11 rounded-lg border border-neutral-400 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-40"
                title={
                  elected.size === 0
                    ? 'Lock at least one line first'
                    : elected.size === spans.length
                      ? 'Everything is locked — finish instead'
                      : undefined
                }
              >
                {busy ? 'Redoing…' : 'Redo the unlocked lines'}
              </button>
              <button
                onClick={() => setStage('final')}
                disabled={busy || spans.length === 0}
                className="min-h-11 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400 disabled:opacity-40"
              >
                It&apos;s right — finish it
              </button>
              <span className="text-xs opacity-60">
                Round {round} · {elected.size}/{spans.length} locked
              </span>
            </div>
          </div>
        </section>
      )}

      {stage === 'final' && (
        <section className="max-w-3xl">
          <h2
            ref={finalHeadingRef}
            tabIndex={-1}
            className="mb-2 text-sm font-medium uppercase tracking-wide opacity-60 outline-none"
          >
            Your prompt, ready to land
          </h2>
          <div className="whitespace-pre-wrap rounded-xl border border-neutral-600 bg-white/5 p-4 text-base leading-relaxed">
            {finalPrompt}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={copyPrompt}
              className="min-h-11 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400"
            >
              {copied ? 'Copied ✓' : 'Copy it'}
            </button>
            <button
              onClick={answerHere}
              disabled={answerBusy || Boolean(answer)}
              className="min-h-11 rounded-lg border border-neutral-400 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-40"
            >
              {answerBusy ? 'Answering…' : 'Answer it here'}
            </button>
            <button
              onClick={() => setStage('rounds')}
              className="inline-flex min-h-11 items-center px-2 text-sm underline opacity-70"
            >
              Back to the lines
            </button>
            <button onClick={reset} className="inline-flex min-h-11 items-center px-2 text-sm underline opacity-70">
              Start over
            </button>
          </div>
          <p className="mt-3 text-xs opacity-60">
            Paste it into any AI you already use — it works everywhere.
          </p>
          {answer && (
            <div className="mt-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium uppercase tracking-wide opacity-60">
                  The answer
                </h3>
                {GAUGE_ON && <GaugeBadge reading={evaluateSeries(answerScores)} />}
              </div>
              <div className="whitespace-pre-wrap rounded-xl border border-neutral-700 bg-white/5 p-4 text-sm leading-relaxed">
                {answer}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
