'use client';

/**
 * /calibrate — the calibrate-to-translate loop, end to end, for a human visitor.
 *
 * 1. Five behavioral intake items (one per receiver primitive) → POST /api/translate {tool:'intake', answers}
 * 2. Profile card: the five-primitive vector, plain-language directives, and why each was derived
 * 3. Translate: paste text → receiver-matched rewrite instructions, or profile-aware interpretation
 *
 * Everything is served by the existing API; this page is wiring, not engine code.
 */

import { useEffect, useState, useCallback } from 'react';

// ── API shapes (mirror @rpcs1/core types; kept local so this stays a leaf page) ──
interface IntakeOption { id: string; label: string; anchor: number }
interface IntakeItem { primitive: 'TI' | 'SG' | 'FT' | 'UE' | 'AR'; prompt: string; options: IntakeOption[] }
interface Profile { TI: number; SG: number; FT: number; UE: number; AR: number }
interface Directives {
  structure: string; warmth: string; explicitness: string; revision: string; ambiguity: string;
  why: Record<string, string>;
}
interface ProfileCard { profile: Profile; directives: Directives; summary: string }

const PRIMITIVE_META: Record<IntakeItem['primitive'], { name: string; plain: string }> = {
  TI: { name: 'Temporal Integration', plain: 'Pace — context before the point' },
  SG: { name: 'Signal Gain', plain: 'Tone — how much warmth lands' },
  FT: { name: 'Filtering Threshold', plain: 'Directness — does subtext land' },
  UE: { name: 'Update Elasticity', plain: 'Flexibility — how revision feels' },
  AR: { name: 'Ambiguity Resolution', plain: 'Ambiguity — commit vs. ask' },
};

async function api(tool: string, body: Record<string, unknown>) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, ...body }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export default function CalibratePage() {
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [card, setCard] = useState<ProfileCard | null>(null);
  const [text, setText] = useState("Honestly it's fine, don't worry about the deadline thing");
  const [risk, setRisk] = useState('advice');
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [outputKind, setOutputKind] = useState<'rewrite' | 'interpret' | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('intake', {})
      .then((d) => setItems(d.items ?? []))
      .catch((e) => setError(e.message));
  }, []);

  const answered = items.length > 0 && items.every((i) => answers[i.primitive]);

  const buildCard = useCallback(async () => {
    setLoading('card'); setError(null);
    try { setCard(await api('intake', { answers })); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  }, [answers]);

  const runTool = useCallback(async (tool: 'rewrite' | 'interpret') => {
    setLoading(tool); setError(null); setOutput(null);
    try {
      const body: Record<string, unknown> = { text, answers };
      if (tool === 'interpret') body.risk = risk;
      setOutput(await api(tool, body));
      setOutputKind(tool);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(null); }
  }, [text, answers, risk]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Calibrate the bridge to you</h1>
        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
          Five quick questions place you on the five receiver primitives — a continuous profile,
          never a category label. Output is then rendered for <em>your</em> profile instead of a
          one-size style. Answers stay in this tab; nothing is stored.
        </p>
        <p className="mt-3 rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3 text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-300">What this is — and isn&apos;t:</strong> these questions
          measure communication preferences — how you like information delivered. They are not a
          psychological assessment, produce no diagnosis or category, and haven&apos;t been
          validated as measuring anything beyond rendering preferences (that validation study is
          pre-registered and not yet run — we label our claims). Deterministic scoring, continuous
          coordinates, your tab only.
        </p>
      </div>

      {error && (
        <div className="border border-red-800 bg-red-950/40 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* ── Step 1: intake ── */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold text-sky-400 uppercase tracking-wide">1 · Calibration</h2>
        {items.length === 0 && !error && <p className="text-sm text-gray-500">Loading questions…</p>}
        {items.map((item) => (
          <fieldset key={item.primitive} className="border border-gray-800 rounded-xl p-4 bg-gray-900/40">
            <legend className="px-1 text-xs font-mono text-gray-500">
              {item.primitive} · {PRIMITIVE_META[item.primitive].plain}
            </legend>
            <p className="text-sm font-medium text-gray-200 mb-3">{item.prompt}</p>
            <div className="space-y-2">
              {item.options.map((opt) => (
                <label key={opt.id} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name={item.primitive}
                    checked={answers[item.primitive] === opt.id}
                    onChange={() => setAnswers((a) => ({ ...a, [item.primitive]: opt.id }))}
                    className="mt-1 accent-sky-500"
                  />
                  <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {items.length > 0 && (
          <button
            onClick={buildCard}
            disabled={!answered || loading === 'card'}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading === 'card' ? 'Scoring…' : answered ? 'Show my profile' : 'Answer all five to continue'}
          </button>
        )}
      </section>

      {/* ── Step 2: profile card ── */}
      {card && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-sky-400 uppercase tracking-wide">2 · Your receiver profile</h2>
          <div className="border border-gray-800 rounded-xl p-5 bg-gray-900/40 space-y-4">
            {(Object.keys(PRIMITIVE_META) as Array<keyof typeof PRIMITIVE_META>).map((k) => (
              <div key={k}>
                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="font-mono text-gray-400">{k} · {PRIMITIVE_META[k].name}</span>
                  <span className="font-mono text-sky-300">{card.profile[k]}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full bg-sky-500/80" style={{ width: `${card.profile[k]}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {card.directives.why[
                    k === 'TI' ? 'structure' : k === 'SG' ? 'warmth' : k === 'FT' ? 'explicitness' : k === 'UE' ? 'revision' : 'ambiguity'
                  ]}
                </p>
              </div>
            ))}
            <p className="text-xs text-gray-500 border-t border-gray-800 pt-3">
              A quick intake is a noisy prior, not a verdict — the bridge refines it from real
              interaction at a rate your own UE governs. Retake any time.
            </p>
          </div>
          <button onClick={() => { setCard(null); setAnswers({}); setOutput(null); setOutputKind(null); }} className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-4">
            Retake calibration
          </button>
        </section>
      )}

      {/* ── Step 3: translate ── */}
      {card && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-sky-400 uppercase tracking-wide">3 · Run something through the bridge</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm"
            placeholder="Paste a message…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => runTool('rewrite')}
              disabled={loading !== null || !text.trim()}
              className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {loading === 'rewrite' ? 'Working…' : 'Rewrite for me'}
            </button>
            <button
              onClick={() => runTool('interpret')}
              disabled={loading !== null || !text.trim()}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-100 px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {loading === 'interpret' ? 'Working…' : 'Interpret with my profile'}
            </button>
            <label className="ml-auto flex items-center gap-2 text-xs text-gray-500">
              risk
              <select value={risk} onChange={(e) => setRisk(e.target.value)} className="bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white">
                <option value="casual">casual</option>
                <option value="advice">advice</option>
                <option value="high-stakes">high-stakes</option>
                <option value="safety-critical">safety-critical</option>
              </select>
            </label>
          </div>

          {output && outputKind === 'rewrite' && (
            <div className="border border-gray-800 rounded-xl p-5 bg-gray-900/40 space-y-3">
              <p className="text-xs font-mono text-sky-300">{String(output.style_label ?? 'Receiver-matched')}</p>
              <p className="text-xs text-gray-500">{String(output.style_description ?? '')}</p>
              {typeof output.rewrite_instructions === 'string' && (
                <pre className="whitespace-pre-wrap text-sm text-gray-200 bg-gray-950 border border-gray-800 rounded-lg p-4">{output.rewrite_instructions}</pre>
              )}
              {typeof output.note === 'string' && <p className="text-xs text-gray-500">{output.note}</p>}
            </div>
          )}
          {output && outputKind === 'interpret' && (
            <pre className="whitespace-pre-wrap text-xs text-gray-300 bg-gray-950 border border-gray-800 rounded-xl p-4 overflow-x-auto">{JSON.stringify(output, null, 2)}</pre>
          )}
        </section>
      )}
    </main>
  );
}
