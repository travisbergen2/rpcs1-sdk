import type { Metadata } from 'next';
import Link from 'next/link';
import { ConnectLinks } from '@/components/ConnectLinks';
import {
  BUNDLE_URL,
  CLIENTS,
  RELEASE_URL,
  SECOND_BRAIN,
  SERVER_README_URL,
  SHARE_CAPS,
  START_LINKS,
} from '@/lib/connect';

export const metadata: Metadata = {
  title: 'Connect your AI to your notes',
  description:
    'Give every AI you use your second brain. Your notes stay on your computer; the AI can search them, quote them by name, and save new notes back — nothing is shared until you choose which folders. One-click setup for Claude Desktop, Cursor, VS Code, and more.',
};

const PRIMARY =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#070b14]';
const SECONDARY =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#070b14]';

export default function ConnectPage() {
  const chatgpt = CLIENTS.find((c) => c.id === 'chatgpt');

  return (
    <div className="bg-[#070b14] text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">Your notes</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Give every AI you use your second brain.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65 sm:text-lg">
          Your notes live on your computer, and they stay there. This connects them to the AI you
          already use — so it can search your notes, quote them by name, and save new notes back,
          linked to where they came from.{' '}
          <strong className="text-white">Nothing is shared until you choose which folders.</strong>
        </p>

        {/* ── Pick your AI ─────────────────────────────────────── */}
        <section className="mt-14" aria-labelledby="pick">
          <h2 id="pick" className="text-2xl font-bold tracking-tight">
            Pick the AI you use
          </h2>
          <p className="mt-1 text-sm text-white/60">One path per app. You only need one.</p>

          <div className="mt-6 space-y-5">
            <section className="rounded-2xl border border-sky-500/40 bg-sky-500/[0.06] p-6">
              <h3 className="text-xl font-semibold text-white">
                Claude Desktop{' '}
                <span className="ml-2 inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 align-middle text-xs font-semibold text-sky-300">
                  easiest — nothing else to install
                </span>
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-white/70">
                <li>
                  <strong className="text-white/90">Download</strong> the add-on file below.
                </li>
                <li>
                  <strong className="text-white/90">Double-click it.</strong> Claude Desktop opens and
                  asks to install — click Install.
                </li>
                <li>
                  <strong className="text-white/90">Answer two questions:</strong> where your notes
                  folder is, and which folders inside it the AI may read. Done.
                </li>
              </ol>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href={BUNDLE_URL} className={PRIMARY}>
                  Download the add-on
                </a>
                <span className="text-xs text-white/50">
                  {SECOND_BRAIN.bundleFile} · {SECOND_BRAIN.bundleSizeLabel} · Windows, Mac, Linux
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-white/50">
                You can change the shared folders anytime in Claude Desktop under Settings → Extensions.
                Don’t have Claude Desktop?{' '}
                <a
                  href="https://claude.ai/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline-offset-4 hover:underline"
                >
                  Get it here (free)
                </a>
                . The add-on is not yet signed, so Claude Desktop may show a notice at install.
              </p>
              <details className="mt-3 text-xs text-white/50">
                <summary className="cursor-pointer font-semibold text-white/70">
                  Check the file (for the careful)
                </summary>
                <p className="mt-2 leading-relaxed">
                  Bundle sha256 <code className="break-all text-sky-300">{SECOND_BRAIN.bundleSha256}</code>.
                  The server file inside is byte-identical to the published package{' '}
                  <code className="text-sky-300">
                    {SECOND_BRAIN.npmPackage}@{SECOND_BRAIN.npmVersion}
                  </code>{' '}
                  (sha256 <code className="break-all text-sky-300">{SECOND_BRAIN.serverDistSha256}</code>).
                  Release notes and the test record:{' '}
                  <a
                    href={RELEASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline-offset-4 hover:underline"
                  >
                    the release page
                  </a>
                  .
                </p>
              </details>
            </section>

            <ConnectLinks />

            <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold text-white">
                {chatgpt?.name ?? 'ChatGPT'}{' '}
                <span className="ml-2 inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 align-middle text-xs font-semibold text-gray-300">
                  not yet
                </span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {chatgpt?.how} So it can’t reach your notes this way yet. Our own app, which is coming,
                will cover this.
              </p>
            </section>
          </div>
        </section>

        {/* ── Start your brain ──────────────────────────────────── */}
        <section className="mt-16" aria-labelledby="start">
          <h2 id="start" className="text-2xl font-bold tracking-tight">
            No notes yet? Start your brain today
          </h2>
          <p className="mt-1 text-sm text-white/60">
            A second brain is just a folder of notes. These free tools fill it fast.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {START_LINKS.map((l) => (
              <a
                key={l.id}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <h3 className="text-base font-semibold text-white group-hover:text-sky-300">
                  {l.label} →
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{l.note}</p>
              </a>
            ))}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <h3 className="text-base font-semibold text-white">Drag and drop</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Any text file dropped into the folder becomes part of the brain. No app required.
              </p>
            </div>
          </div>
        </section>

        {/* ── What leaves your computer ─────────────────────────── */}
        <section
          className="mt-16 rounded-2xl border border-sky-500/30 bg-[#0a0f1a] p-6 sm:p-8"
          aria-labelledby="privacy"
        >
          <h2 id="privacy" className="text-2xl font-bold tracking-tight">
            What leaves your computer
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/75">
            <li>
              <strong className="text-white">Everything starts OFF.</strong> Until you choose folders,
              every request is refused and nothing is read.
            </li>
            <li>
              <strong className="text-white">Small by design.</strong> A search shares at most{' '}
              {SHARE_CAPS.snippets} short snippets — about {SHARE_CAPS.chars.toLocaleString('en-US')}{' '}
              characters, roughly half a page — per question.
            </li>
            <li>
              <strong className="text-white">Everything is disclosed.</strong> Every answer lists exactly
              which notes were used and how much was shared.
            </li>
            <li>
              <strong className="text-white">Your notes keep receipts.</strong> A log note records every
              request — yours to read, edit, or delete.
            </li>
            <li>
              <strong className="text-white">Saving is safe.</strong> The AI can only create new notes in
              one folder. It can never change or delete anything.
            </li>
            <li>
              <strong className="text-white">One destination.</strong> Your notes go only to the AI app
              you connected — nowhere else. Nothing is hosted by us. No tracking.
            </li>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-white/50">
            Honesty note: once a snippet reaches the AI app, its handling is governed by that app and
            its provider — the same as anything you type there. Full details in{' '}
            <a
              href={SERVER_README_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline-offset-4 hover:underline"
            >
              the connector’s documentation
            </a>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/loop" className={SECONDARY}>
            Open the loop
          </Link>
          <Link href="/labs" className={SECONDARY}>
            Everything else in Labs
          </Link>
        </div>
      </div>
    </div>
  );
}
