import type { Metadata } from 'next';
import SendBox from '@/components/SendBox';

export const metadata: Metadata = {
  title: 'SendRight — Say it your way. Send it right.',
  description:
    'Type your prompt the way you would say it out loud. SendRight shows you what your words actually say — before the AI picks the wrong reading — then opens your own AI app with the clear version filled in.',
};

export default function SendPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-[5%] py-16 text-neutral-100">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">SendRight</h1>
        <p className="mt-1 text-lg text-neutral-400">Say it your way. Send it right.</p>

        <p className="mt-6 text-neutral-300">
          The AI answered the question you <em>almost</em> asked. SendRight makes sure it
          hears the one you meant.
        </p>

        <div className="mt-8">
          <SendBox />
        </div>

        <div className="mt-12 space-y-2 text-sm text-neutral-500">
          <p>No signup. No API keys. Free.</p>
          <p>
            Your chats stay in your apps — SendRight hands off before the conversation
            starts and never sees the answer.
          </p>
        </div>
      </div>
    </main>
  );
}
