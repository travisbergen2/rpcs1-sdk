'use client';

/**
 * The Guessing Test — the own-sentence demo.
 *
 * Onboarding principle (2026-07-29): show the diff, don't explain the diff.
 * The visitor pastes THEIR OWN sentence and sees, side by side, what an AI
 * would silently assume vs. what it should have asked. Everything runs
 * client-side and deterministically (mirror + routeIntent from @rpcs1/core):
 * same sentence → same result, no model call, no latency, no API key.
 *
 * Copy register: intuition-first. The mechanism (entropy, posteriors, fork
 * detectors) stays out of the visitor's face; "how it works" is one click
 * deep on /docs.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { mirror, routeIntent, DEFAULT_INTENT_HYPOTHESES } from '@rpcs1/core';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const EXAMPLES = [
  'I gotta fly to the bank, so I can pay cast.',
  'Meet me at the bank with the fishing rods and the deposit slip.',
  'I need something to make my business more efficient.',
  'Can you help me with my website?',
];

export function GuessTest() {
  const [text, setText] = useState('');
  const [ran, setRan] = useState<string | null>(null);

  const result = useMemo(() => {
    if (!ran) return null;
    const m = mirror(ran);
    const r = routeIntent(ran, DEFAULT_INTENT_HYPOTHESES);
    const wouldAsk = r.mode === 'clarify' || r.mode === 'present_options';
    return { m, r, wouldAsk };
  }, [ran]);

  return (
    <div className="mx-auto max-w-3xl">
      <label htmlFor="guess-input" className="sr-only">A message to test for misreadings</label>
      <textarea
        id="guess-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Paste the last message an AI got wrong — or any sentence you'd send one."
        className="w-full rounded-xl border border-slate-600 bg-slate-900/60 p-4 text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => setRan(text.trim())} disabled={text.trim().length === 0}>
          Run the guessing test
        </Button>
        <span className="text-xs text-slate-500">Runs instantly on your device. Nothing is sent anywhere.</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setText(ex); setRan(ex); }}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:border-sky-500 hover:text-slate-200"
          >
            “{ex.length > 44 ? `${ex.slice(0, 42)}…` : ex}”
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-8">
          {!result.wouldAsk && result.m.clean ? (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-5 text-slate-200">
              <p className="font-semibold text-emerald-300">This one reads clean.</p>
              <p className="mt-1 text-sm text-slate-300">
                One meaning clearly wins, so an AI guessing here is fine — and a good one should answer
                without pestering you. Try a sentence with a typo, a word that cuts two ways, or a vague ask.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* The silent guess */}
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                  What an AI silently assumes
                </p>
                <p className="mt-3 text-slate-200">
                  It picks <span className="font-semibold text-rose-300">one</span> reading
                  {result.r.top ? <> — “{result.r.top.label}” — </> : ' '}
                  and answers as if that were certain. If the guess is wrong, every reply after it
                  builds on the wrong meaning. That cleanup is the <span className="font-semibold">realignment tax</span>:
                  the messages you spend dragging a conversation back to what you actually meant.
                </p>
              </div>

              {/* What should have happened */}
              <div className="rounded-xl border border-sky-900/60 bg-sky-950/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
                  What it should have asked
                </p>
                {result.m.ambiguousSpans.length > 0 && (
                  <ul className="mt-3 space-y-3">
                    {result.m.ambiguousSpans.slice(0, 2).map((s) => (
                      <li key={`${s.kind}:${s.start}`} className="text-sm text-slate-200">
                        <span className="rounded bg-sky-900/50 px-1.5 py-0.5 font-mono text-sky-200">“{s.text}”</span>{' '}
                        cuts more than one way:
                        <ul className="mt-1.5 ml-4 list-disc space-y-1 text-slate-300">
                          {s.readings.map((rd) => (
                            <li key={rd.id}>{rd.summary}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
                {result.m.ambiguousSpans.length === 0 && result.r.clarifyingQuestion && (
                  <p className="mt-3 text-sm text-slate-200">“{result.r.clarifyingQuestion}”</p>
                )}
                {result.m.ambiguousSpans.length === 0 && !result.r.clarifyingQuestion && result.r.options && (
                  <ul className="mt-3 ml-4 list-disc space-y-1 text-sm text-slate-300">
                    {result.r.options.map((o) => (
                      <li key={o.id}>{o.paraphrase ?? o.label}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  One question now costs you five seconds. A wrong guess costs you the thread.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-sm text-slate-300">
              This check ran entirely on your device, with no AI involved — which is the point:
              catching the fork <span className="font-semibold text-slate-100">before you send</span> doesn&apos;t
              need anyone&apos;s permission. Check your own messages in{' '}
              <Link href="/send" className="text-sky-400 underline-offset-2 hover:underline">the send box</Link>,
              or give your AI the same reflex with{' '}
              <Link href="/docs" className="text-sky-400 underline-offset-2 hover:underline">the connector</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function GuessTestPageBody() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold text-white sm:text-4xl">
        One wrong guess costs you the whole conversation.
      </h1>
      <p className={cn('mx-auto mt-4 max-w-2xl text-center text-slate-300')}>
        AI assistants don&apos;t say “that could mean two things.” They pick one meaning, silently,
        and build every following answer on it. Paste a sentence and see the guess you never got to veto.
      </p>
      <div className="mt-10">
        <GuessTest />
      </div>
    </main>
  );
}
