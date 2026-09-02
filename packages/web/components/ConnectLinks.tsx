'use client';

import { useId, useState } from 'react';
import {
  CLIENTS,
  VAULT_PLACEHOLDER,
  claudeCodeCommand,
  cursorInstallLink,
  mcpServersSnippet,
  vscodeInstallLink,
} from '@/lib/connect';

/**
 * The per-app setup cards that depend on the user's notes folder. One field
 * at the top; every link and snippet below re-renders with what they typed,
 * so nobody has to hand-edit a config file. Leaving it blank shows a
 * visible placeholder to replace later.
 */
export function ConnectLinks() {
  const [vault, setVault] = useState('');
  const [announce, setAnnounce] = useState('');
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  const cursor = cursorInstallLink(vault);
  const vscode = vscodeInstallLink(vault);
  const oneLiner = claudeCodeCommand(vault);
  const snippet = mcpServersSnippet(vault);
  const pasteClients = CLIENTS.filter((c) => c.tier === 'paste');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-6">
        <label htmlFor={fieldId} className="block text-base font-semibold text-white">
          Where is your notes folder?
        </label>
        <p id={hintId} className="mt-1 text-sm leading-relaxed text-white/60">
          Type or paste the folder path once and every button and snippet below fills it in.
          Examples: <code className="text-sky-300">C:\Users\you\Documents\Notes</code> (Windows),{' '}
          <code className="text-sky-300">/Users/you/Notes</code> (Mac),{' '}
          <code className="text-sky-300">/home/you/Notes</code> (Linux). Leave it blank and the
          links show <code className="text-sky-300">{VAULT_PLACEHOLDER}</code> for you to replace later.
        </p>
        <input
          id={fieldId}
          type="text"
          value={vault}
          onChange={(e) => setVault(e.target.value)}
          placeholder={VAULT_PLACEHOLDER}
          aria-describedby={hintId}
          autoComplete="off"
          spellCheck={false}
          className="mt-4 w-full rounded-lg border border-gray-700 bg-[#0a0f1a] px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>

      <span className="sr-only" aria-live="polite">
        {announce}
      </span>

      <Card title="Cursor" tag="for coding-tool users">
        <Steps
          items={[
            'Click the button. Cursor opens and asks to add “second-brain” — accept.',
            'Check the folder path it shows is your notes folder (it comes from the field above).',
          ]}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={cursor} className={PRIMARY}>
            Add to Cursor
          </a>
          <Note>Cursor runs the connector with a free helper program called Node, which coding setups already have.</Note>
        </div>
      </Card>

      <Card title="VS Code" tag="for coding-tool users">
        <Steps
          items={[
            'Click the button. VS Code opens and asks to add the server — accept.',
            'Check the folder path it shows is your notes folder.',
          ]}
        />
        <div className="mt-4">
          <a href={vscode} className={PRIMARY}>
            Add to VS Code
          </a>
        </div>
      </Card>

      <Card title="Claude Code" tag="terminal">
        <p className="text-sm text-white/70">Paste this one line into the terminal:</p>
        <CodeBlock code={oneLiner} label="the Claude Code command" onCopied={setAnnounce} />
      </Card>

      <Card title="Windsurf · Gemini CLI · LM Studio" tag="paste-in setup">
        <p className="text-sm text-white/70">All of these use the same snippet:</p>
        <CodeBlock code={snippet} label="the settings snippet" onCopied={setAnnounce} />
        <details className="mt-3 text-sm text-white/70">
          <summary className="cursor-pointer font-semibold text-white/85">Where to paste it</summary>
          <ul className="mt-2 space-y-1.5">
            {pasteClients.map((c) => (
              <li key={c.id}>
                <span className="font-semibold text-white/85">{c.name}:</span>{' '}
                <code className="text-sky-300">{c.configPath}</code>
                {c.id === 'claude-desktop-manual' ? ' — Settings → Developer → Edit Config' : ''}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-white/55">
            For developers: this is the open connector standard known as MCP; any app that can run a
            local (stdio) server works.
          </p>
        </details>
      </Card>
    </div>
  );
}

const PRIMARY =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#070b14]';

function Card({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
      <h3 className="text-xl font-semibold text-white">
        {title}{' '}
        <span className="ml-2 inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 align-middle text-xs font-semibold text-gray-300">
          {tag}
        </span>
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-white/70">
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-white/50">{children}</p>;
}

function CodeBlock({
  code,
  label,
  onCopied,
}: {
  code: string;
  label: string;
  onCopied: (msg: string) => void;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
      onCopied(`Copied ${label}.`);
    } catch {
      setState('failed');
      onCopied(`Could not copy automatically — select the text and copy it.`);
    }
    window.setTimeout(() => setState('idle'), 2500);
  }

  return (
    <div className="relative mt-3">
      <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 pr-24 text-sm leading-relaxed text-gray-200">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="absolute right-3 top-3 inline-flex min-h-9 items-center rounded-md border border-gray-700 bg-gray-900 px-3 text-xs font-semibold text-gray-200 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select & copy' : 'Copy'}
      </button>
    </div>
  );
}
