import type { Metadata } from 'next';
import SendBox from '@/components/SendBox';

export const metadata: Metadata = {
  title: 'SendRight — Say it your way. Send it right.',
  description:
    'Type your prompt the way you would say it out loud. SendRight shows you what your words actually say — before the AI picks the wrong reading — then opens your own AI app with the clear version filled in.',
};

const BEATS = [
  {
    n: '1',
    title: 'Type like you talk',
    body: 'No formats, no magic words. Paste a word-salad if that’s what you’ve got.',
  },
  {
    n: '2',
    title: 'See what you said',
    body: 'The moment your prompt forks — “wait, did I mean compare them, or pick one?” — SendRight shows you the fork. Contradictions and tangled asks get flagged too. Most prompts sail straight through.',
  },
  {
    n: '3',
    title: 'Send it right',
    body: 'One tap opens your own ChatGPT, Claude, Perplexity, or Grok with the clear version already filled in. You hit send.',
  },
];

export default function SendPage() {
  return (
    <div className="bg-[#070b14] text-white">
      {/* ── Hero + the Box ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(16,185,129,0.14),transparent)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-16 text-center sm:px-6">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            SendRight
          </p>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Say it your way.{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">
              Send it right.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            The AI answered the question you <em className="text-gray-300">almost</em> asked.
            SendRight makes sure it hears the one you meant.
          </p>

          <div className="mt-10 text-left">
            <SendBox />
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> No signup
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> No API keys
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Free
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Your chats stay in your apps
            </span>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#090e1a]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {BEATS.map((b) => (
              <div key={b.n} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300">
                  {b.n}
                </span>
                <h2 className="mt-3 text-base font-semibold text-white">{b.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it's different + honesty note ─────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Prompt fixers polish your wording.
          <br className="hidden sm:block" /> SendRight shows you the{' '}
          <span className="text-emerald-300">readings</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-400">
          Including the one you didn&apos;t know was in there. That&apos;s the difference between
          a nicer sentence and being understood the first time.
        </p>
        <p className="mx-auto mt-8 max-w-xl rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-gray-400">
          Model suggestions come with their receipts: measured ones say when and how they were
          measured; the rest say <span className="italic">&ldquo;not yet measured&rdquo;</span>.
          We&apos;d rather show you an empty cell than a made-up number.
        </p>
        <p className="mt-6 text-xs text-gray-400">
          SendRight hands off before the conversation starts and never sees the answer.
        </p>
      </section>
    </div>
  );
}
