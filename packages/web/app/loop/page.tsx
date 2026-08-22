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

import { useCallback, useMemo, useState } from 'react';

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

  const finalPrompt = useMemo(
    () => spans.map((s) => s.text.trim()).filter(Boolean).join(' '),
    [spans],
  );

  const callLoop = useCallback(
    async (body: Record<string, unknown>): Promise<LoopApiResponse | null> => {
      setBusy(true);
      setError(null);
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
    const data = await callLoop({ text: dump });
    if (!data?.spans) return;
    setSpans(data.spans);
    setElected(new Set());
    setRound(1);
    setHeld(false);
    setStage('rounds');
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
  }, [dump, spans, elected, callLoop]);

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
      setAnswer(data.answer);
    } catch {
      setError('Network hiccup — copy the prompt into your own AI.');
    } finally {
      setAnswerBusy(false);
    }
  }, [finalPrompt]);

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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Say it once. Make sure it landed.
        </h1>
        <p className="mt-2 max-w-2xl text-base opacity-80">
          Brain-dump what you want. See exactly what the AI heard. Lock the
          lines it got right — it redoes only the rest. When it finally reads
          like your own thought, send it.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {stage === 'input' && (
        <section>
          <textarea
            value={dump}
            onChange={(e) => setDump(e.target.value)}
            placeholder="Dump it here exactly how it comes out — half-sentences, tangents, all of it."
            className="h-56 w-full resize-y rounded-xl border border-neutral-600 bg-white/5 p-4 text-base leading-relaxed text-inherit outline-none placeholder:opacity-50 focus:border-amber-400"
            maxLength={8000}
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={firstRound}
              disabled={busy || !dump.trim()}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-amber-400 disabled:opacity-40"
            >
              {busy ? 'Reading…' : 'Show me what it heard'}
            </button>
            <span className="text-xs opacity-60">{dump.length}/8000</span>
          </div>
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
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-60">
              What it heard — tap the lines that are right
            </h2>
            {held && (
              <p className="mb-2 rounded-md bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200">
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
                      'rounded-lg border px-3 py-2 text-left text-sm leading-relaxed transition ' +
                      (locked
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100'
                        : 'border-neutral-600 bg-transparent hover:border-neutral-300')
                    }
                    aria-pressed={locked}
                  >
                    {locked ? '✓ ' : ''}
                    {s.text}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={nextRound}
                disabled={busy || elected.size === 0 || elected.size === spans.length}
                className="rounded-lg border border-neutral-400 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-40"
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
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400 disabled:opacity-40"
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
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-60">
            Your prompt, ready to land
          </h2>
          <div className="whitespace-pre-wrap rounded-xl border border-neutral-600 bg-white/5 p-4 text-base leading-relaxed">
            {finalPrompt}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={copyPrompt}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400"
            >
              {copied ? 'Copied ✓' : 'Copy it'}
            </button>
            <button
              onClick={answerHere}
              disabled={answerBusy || Boolean(answer)}
              className="rounded-lg border border-neutral-400 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-40"
            >
              {answerBusy ? 'Answering…' : 'Answer it here'}
            </button>
            <button onClick={() => setStage('rounds')} className="text-sm underline opacity-70">
              Back to the lines
            </button>
            <button onClick={reset} className="text-sm underline opacity-70">
              Start over
            </button>
          </div>
          <p className="mt-3 text-xs opacity-60">
            Paste it into any AI you already use — it works everywhere.
          </p>
          {answer && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium uppercase tracking-wide opacity-60">
                The answer
              </h3>
              <div className="whitespace-pre-wrap rounded-xl border border-neutral-700 bg-white/5 p-4 text-sm leading-relaxed">
                {answer}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
