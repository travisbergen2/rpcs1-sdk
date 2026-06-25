'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type QuestionId = 'what' | 'why' | 'time' | 'price';

const QUESTIONS: Record<
  QuestionId,
  {
    label: string;
    answer: string;
    cta: { href: string; label: string };
  }
> = {
  what: {
    label: 'What does this do?',
    answer:
      'RPCS-1 reviews whether an AI agent is configured for the conditions it faces. It flags likely consistency, grounding, escalation, and resolution risks, then recommends a safer runtime posture. The free sample is a fast way to test the workflow before buying a paid diagnostic.',
    cta: { href: '/api/checkout?tier=diagnostic', label: 'Buy the diagnostic' },
  },
  why: {
    label: 'Why not just prompt better?',
    answer:
      'Prompting changes instructions. RPCS-1 reviews operating risk: case variability, ambiguity, stakes, context, and when the agent should act or hand off. That helps explain failures that prompt edits alone do not fix.',
    cta: { href: '/docs/matching', label: 'See the framework' },
  },
  time: {
    label: 'How fast is it?',
    answer:
      'The free sample takes about a minute. Start from a support, coding, or research preset, then decide whether you want the paid report and implementation guidance.',
    cta: { href: '/tuner', label: 'Try the free sample' },
  },
  price: {
    label: 'Is it free?',
    answer:
      'The web sample assessment is free and does not require an account. The paid diagnostic report is $750 one-time, and recurring SDK and team plans are for repeatable reviews and workflows.',
    cta: { href: '/pricing', label: 'View pricing' },
  },
};

const QUESTION_ORDER: QuestionId[] = ['what', 'why', 'time', 'price'];

function ReceiverMascot({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'relative h-16 w-16 shrink-0 rounded-2xl border border-sky-400/30 bg-gray-950 shadow-lg shadow-sky-500/20 transition-transform duration-300',
        active ? 'translate-y-0 rotate-0' : 'translate-y-1 rotate-[-2deg]'
      )}
      aria-hidden="true"
    >
      <div className="absolute -top-3 left-1/2 h-5 w-px -translate-x-1/2 bg-sky-400/60" />
      <div className="absolute -top-4 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.9)]" />
      <div className="absolute left-4 top-5 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.75)]" />
      <div className="absolute right-4 top-5 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.75)]" />
      <div className="absolute bottom-4 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full bg-gray-700" />
      <div className="absolute -right-1 top-6 h-3 w-1 rounded-full bg-emerald-300/80" />
      <div className="absolute inset-0 rounded-2xl bg-sky-400/5 animate-pulse" />
    </div>
  );
}

export function AgentGuide() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<QuestionId>('what');

  const selectedQuestion = useMemo(() => QUESTIONS[selected], [selected]);

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm sm:bottom-6 sm:right-6">
      {open ? (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-start gap-4 border-b border-gray-800 p-4">
            <ReceiverMascot active={open} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Ask about the assessment</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
                  aria-label="Close guide"
                >
                  x
                </button>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                I can answer the questions visitors usually have before they try RPCS-1.
              </p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              {QUESTION_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={cn(
                    'min-h-10 rounded-lg border px-3 py-2 text-left text-xs font-medium leading-snug transition-colors',
                    selected === id
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                      : 'border-gray-800 bg-gray-900/80 text-gray-400 hover:border-gray-700 hover:text-gray-100'
                  )}
                >
                  {QUESTIONS[id].label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
              <p className="text-sm leading-relaxed text-gray-300">{selectedQuestion.answer}</p>
              <Link
                href={selectedQuestion.cta.href}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
              >
                {selectedQuestion.cta.label}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto flex items-center gap-3 rounded-2xl border border-sky-400/30 bg-gray-950/95 p-3 text-left shadow-2xl shadow-black/40 backdrop-blur transition-transform hover:-translate-y-1"
          aria-label="Open RPCS-1 guide"
        >
          <ReceiverMascot active={open} />
          <span className="pr-2 text-sm font-semibold text-white">Questions?</span>
        </button>
      )}
    </aside>
  );
}
