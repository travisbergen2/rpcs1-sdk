'use client';

/**
 * Repaste — the one box.
 *
 * Paste it rough → pick who's reading → copy it right.
 *
 * Flow: choose a receiver persona (a ReceiverProfile preset — no user
 * profiling anywhere), paste a rough prompt, Align. The persona vector goes
 * to POST /api/translate {tool:'rewrite', profile}. When the model gateway is
 * configured the rewritten prompt comes back executed; otherwise the
 * deterministic receiver-derived instructions come back and are shown with an
 * honest note. The "why?" reveal shows the mechanism one click deep.
 */
import { useState } from 'react';
import Link from 'next/link';
import { PERSONAS, type ReceiverPersona } from '@/lib/personas';
import { PersonaAvatar } from '@/components/PersonaAvatar';
import { cn } from '@/lib/cn';

interface RewriteResponse {
  original: string;
  style: string;
  style_label: string;
  style_description: string;
  rewrite_instructions: string;
  rewritten?: string | null;
  note: string;
  engine?: string;
  error?: string;
}

function GradeBadge({ persona }: { persona: ReceiverPersona }) {
  if (persona.grade === 'measured') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        measured {persona.measuredDate} · {persona.testedVersion}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"
      title="Sketched from documented default behavior — not yet a measured battery result."
    >
      provisional
    </span>
  );
}

export function RepasteApp() {
  const [selected, setSelected] = useState<ReceiverPersona>(PERSONAS[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function align() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setRevealOpen(false);
    setCopied(false);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'rewrite', text, profile: selected.profile }),
      });
      const data: RewriteResponse = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const output = result?.rewritten ?? null;

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — selection still works */
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      {/* ── Receiver gallery ──────────────────────────────── */}
      <p className="mb-3 text-center text-sm text-white/50">Who&apos;s reading?</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSelected(p);
              setDetailsFor(null);
            }}
            className={cn(
              'group rounded-2xl border p-4 text-left transition',
              selected.id === p.id
                ? 'border-white/40 bg-white/[0.07]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/25',
            )}
            aria-pressed={selected.id === p.id}
          >
            <div className="flex items-start justify-between">
              <PersonaAvatar hue={p.hue} motif={p.motif} size={48} />
              <GradeBadge persona={p} />
            </div>
            <div className="mt-3 text-sm font-semibold text-white">{p.title}</div>
            <div className="mt-1 text-xs leading-relaxed text-white/55">{p.tagline}</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDetailsFor(detailsFor === p.id ? null : p.id);
              }}
              className="mt-2 text-[11px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
            >
              {detailsFor === p.id ? 'less' : 'how it reads'}
            </button>
            {detailsFor === p.id && (
              <div className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-white/50">
                {p.details}
                <div className="mt-1.5 text-white/35">
                  Works well with: {p.worksWellWith.join(', ')} <em>(provisional suggestion)</em>
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/30">
                  TI {p.profile.TI} · SG {p.profile.SG} · FT {p.profile.FT} · UE {p.profile.UE} · AR {p.profile.AR}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── The box ───────────────────────────────────────── */}
      <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.03] p-4 focus-within:border-white/30">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Say it your way. Rough is fine."
          className="w-full resize-y bg-transparent text-base leading-relaxed text-white placeholder-white/30 outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-white/40">
            Aligning for <span className="text-white/70">{selected.title}</span>
          </span>
          <button
            type="button"
            onClick={align}
            disabled={busy || !text.trim()}
            className={cn(
              'rounded-xl px-5 py-2 text-sm font-semibold transition',
              busy || !text.trim()
                ? 'cursor-not-allowed bg-white/10 text-white/40'
                : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:opacity-90',
            )}
          >
            {busy ? 'Aligning…' : 'Align'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* ── Result ────────────────────────────────────────── */}
      {result && (
        <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.04] p-5">
          {output ? (
            <>
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{output}</div>
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={copyOutput}
                  className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => setRevealOpen(!revealOpen)}
                  className="text-sm text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
                >
                  why?
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-white/60">
                The alignment instructions are ready — the rewriting model isn&apos;t configured on this deployment, so
                here they are directly. Paste them as a system prompt in front of your text:
              </p>
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs leading-relaxed text-white/75">
                {result.rewrite_instructions}
              </div>
              <button
                type="button"
                onClick={() => setRevealOpen(!revealOpen)}
                className="mt-3 text-sm text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
              >
                why?
              </button>
            </>
          )}

          {/* ── The reveal: mechanism one click deep ──────── */}
          {revealOpen && (
            <div className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/60">
              <p>
                <span className="text-white/80">{selected.title}</span> — {selected.details}
              </p>
              {output && (
                <>
                  <p className="mt-3 text-white/50">The rewrite followed these receiver-derived rules:</p>
                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs text-white/60">
                    {result.rewrite_instructions}
                  </div>
                </>
              )}
              <p className="mt-3 font-mono text-xs text-white/35">{result.style_description}</p>
              {result.engine && <p className="mt-1 text-xs text-white/30">engine: {result.engine}</p>}
              <p className="mt-3 text-xs text-white/40">
                Runtime settings (temperature, token budget) are a separate dial —{' '}
                <Link href="/tuner" className="underline underline-offset-2 hover:text-white/70">
                  the Tuner
                </Link>{' '}
                derives them from your task. Full mechanism:{' '}
                <Link href="/docs" className="underline underline-offset-2 hover:text-white/70">
                  docs
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
