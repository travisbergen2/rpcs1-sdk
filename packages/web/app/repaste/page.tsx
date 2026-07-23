import type { Metadata } from 'next';
import { RepasteApp } from '@/components/RepasteApp';

export const metadata: Metadata = {
  title: 'Repaste — Paste it rough. Copy it right.',
  description:
    'Pick who’s reading, paste your prompt the way it comes out, and copy back a version aligned to that receiver. No signup, no profiling.',
};

export default function RepastePage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(14,165,233,0.10),transparent)]"
      />
      <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-6">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Repaste</h1>
          <p className="mt-3 text-lg text-white/60">
            Paste it rough. <span className="text-white/90">Copy it right.</span>
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
            Every model reads differently. Pick the reader, and your words arrive the way you meant them.
          </p>
        </header>
        <RepasteApp />
      </main>
    </div>
  );
}
