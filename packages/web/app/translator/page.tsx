'use client';

import { useState, useCallback, useRef } from 'react';
import { EvidenceCard } from '@/components/EvidenceCard';

export default function TranslatorPage() {
  const [activeTab, setActiveTab] = useState('interpret');
  const [result, setResult] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Form states
  const [interpretText, setInterpretText] = useState("I'm fine");
  const [interpretRisk, setInterpretRisk] = useState('advice');
  const [normalizeText, setNormalizeText] = useState('I was thinking... about the project... and also the deadline');
  const [splitText, setSplitText] = useState('I want to build this new feature and also fix that bug');
  const [rewriteText, setRewriteText] = useState('Your code is wrong and you need to fix it');
  const [rewriteStyle, setRewriteStyle] = useState('socially_gentle');
  const [routeType, setRouteType] = useState('code');
  const [routeObjective, setRouteObjective] = useState('');
  const [scoreCandidates, setScoreCandidates] = useState(JSON.stringify([
    { label: 'Okay', interpConf: 0.80, userEvid: 0.20, epistemic: 0.50, narrative: 0.50, semGap: 0.10, transInteg: 1.00 },
    { label: 'Frustrated', interpConf: 0.40, userEvid: 0.90, epistemic: 0.50, narrative: 0.50, semGap: 0.70, transInteg: 0.90 },
  ], null, 2));
  const [scoreRisk, setScoreRisk] = useState('casual');

  const callApi = useCallback(async (tool: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, ...body }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const TABS = [
    { id: 'interpret', label: 'Interpret' },
    { id: 'normalize', label: 'Normalize' },
    { id: 'split', label: 'Split' },
    { id: 'rewrite', label: 'Rewrite' },
    { id: 'route', label: 'Route' },
    { id: 'score', label: 'Score' },
  ];

  // Roving-tabindex arrow-key navigation (ARIA tabs pattern): Left/Right/Home/End
  // move focus AND selection; Tab leaves the tablist.
  const onTabKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (currentIndex + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const id = TABS[next].id;
    setActiveTab(id);
    tabRefs.current.get(id)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputCls = 'w-full bg-gray-950 border border-gray-500 rounded-lg px-4 py-2.5 text-white text-sm';
  const selectCls = 'bg-gray-950 border border-gray-500 rounded-lg px-3 py-1.5 text-sm text-white';
  const buttonCls = 'bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold';

  function renderTabContent() {
    switch (activeTab) {
      case 'interpret':
        return (
          <div className="space-y-3">
            <label htmlFor="interpret-text" className="block text-sm font-medium text-gray-300">Message to interpret</label>
            <input id="interpret-text" value={interpretText} onChange={(e) => setInterpretText(e.target.value)}
              className={inputCls} />
            <div className="flex items-center gap-3">
              <label htmlFor="interpret-risk" className="text-sm text-gray-400">Risk:</label>
              <select id="interpret-risk" value={interpretRisk} onChange={(e) => setInterpretRisk(e.target.value)}
                className={selectCls}>
                {['casual','advice','high-stakes','safety-critical'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => callApi('interpret', { text: interpretText, risk: interpretRisk })}
                disabled={loading} aria-busy={loading}
                className={`ml-auto ${buttonCls}`}>
                {loading ? 'Working…' : 'Interpret'}
              </button>
            </div>
          </div>
        );
      case 'normalize':
        return (
          <div className="space-y-3">
            <label htmlFor="normalize-text" className="block text-sm font-medium text-gray-300">Fragmented text</label>
            <textarea id="normalize-text" value={normalizeText} onChange={(e) => setNormalizeText(e.target.value)}
              className={`${inputCls} min-h-[80px]`} />
            <button onClick={() => callApi('normalize', { text: normalizeText })}
              disabled={loading} aria-busy={loading} className={buttonCls}>
              {loading ? 'Working…' : 'Normalize'}
            </button>
          </div>
        );
      case 'split':
        return (
          <div className="space-y-3">
            <label htmlFor="split-text" className="block text-sm font-medium text-gray-300">Mixed intents</label>
            <textarea id="split-text" value={splitText} onChange={(e) => setSplitText(e.target.value)}
              className={`${inputCls} min-h-[80px]`} />
            <button onClick={() => callApi('split', { text: splitText })}
              disabled={loading} aria-busy={loading} className={buttonCls}>
              {loading ? 'Working…' : 'Split'}
            </button>
          </div>
        );
      case 'rewrite':
        return (
          <div className="space-y-3">
            <label htmlFor="rewrite-text" className="block text-sm font-medium text-gray-300">Text to rewrite</label>
            <textarea id="rewrite-text" value={rewriteText} onChange={(e) => setRewriteText(e.target.value)}
              className={`${inputCls} min-h-[80px]`} />
            <div className="flex items-center gap-3">
              <label htmlFor="rewrite-style" className="text-sm text-gray-400">Style:</label>
              <select id="rewrite-style" value={rewriteStyle} onChange={(e) => setRewriteStyle(e.target.value)}
                className={selectCls}>
                {['technical','plain','socially_gentle','concise','detailed','direct'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => callApi('rewrite', { text: rewriteText, style: rewriteStyle })}
                disabled={loading} aria-busy={loading}
                className={`ml-auto ${buttonCls}`}>
                {loading ? 'Working…' : 'Rewrite'}
              </button>
            </div>
          </div>
        );
      case 'route':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label htmlFor="route-type" className="text-sm text-gray-400">Task type:</label>
              <select id="route-type" value={routeType} onChange={(e) => setRouteType(e.target.value)}
                className={selectCls}>
                {['code','creative_writing','analysis','chat','translation','reasoning','planning','emotional'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label htmlFor="route-objective" className="sr-only">Objective (optional)</label>
            <input id="route-objective" value={routeObjective} onChange={(e) => setRouteObjective(e.target.value)}
              placeholder="Objective (optional)"
              className={inputCls} />
            <button onClick={() => callApi('route', { task_type: routeType, objective: routeObjective })}
              disabled={loading} aria-busy={loading} className={buttonCls}>
              {loading ? 'Working…' : 'Route'}
            </button>
          </div>
        );
      case 'score':
        return (
          <div className="space-y-3">
            <label htmlFor="score-candidates" className="block text-sm font-medium text-gray-300">Candidates JSON</label>
            <textarea id="score-candidates" value={scoreCandidates} onChange={(e) => setScoreCandidates(e.target.value)}
              className={`${inputCls} font-mono min-h-[180px]`} />
            <div className="flex items-center gap-3">
              <label htmlFor="score-risk" className="text-sm text-gray-400">Risk:</label>
              <select id="score-risk" value={scoreRisk} onChange={(e) => setScoreRisk(e.target.value)}
                className={selectCls}>
                {['casual','advice','high-stakes','safety-critical'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => {
                try { JSON.parse(scoreCandidates); } catch { setError('Invalid JSON'); return; }
                callApi('score', { candidates: JSON.parse(scoreCandidates), risk: scoreRisk });
              }}
                disabled={loading} aria-busy={loading}
                className={`ml-auto ${buttonCls}`}>
                {loading ? 'Working…' : 'Score'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-sky-400 mb-3">rpcs1.dev / translator</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
          RPCS-1 Translator Hub
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl">
          Intent extraction, ambiguity resolution, audience-aware rewriting, and task routing —
          powered by the{' '}
          <a href="/docs/translation-layer" className="text-sky-400 underline underline-offset-4 hover:text-sky-300">HF-HATP v1.9</a> protocol.
        </p>
      </div>

      {/* Tabs — ARIA tabs pattern: roving tabindex, arrow keys move selection */}
      <div role="tablist" aria-label="Translator tools" className="flex flex-wrap gap-2 mb-6 border-b border-gray-800 pb-2">
        {TABS.map((tab, i) => (
          <button key={tab.id}
            ref={(el) => { if (el) tabRefs.current.set(tab.id, el); }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls="tool-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-sky-500/10 text-sky-300 border-b-2 border-sky-500' : 'text-gray-400 hover:text-gray-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div role="tabpanel" id="tool-panel" aria-labelledby={`tab-${activeTab}`}
        className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-5">
        {renderTabContent()}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-5">
          <p className="text-red-400 text-sm font-mono">{error}</p>
        </div>
      )}

      {/* Screen-reader announcement when a result lands (the JSON itself stays out of the live region) */}
      <p className="sr-only" role="status">
        {loading ? 'Working…' : result ? 'Result ready below.' : ''}
      </p>

      {/* Result */}
      {result && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Result</h2>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
              aria-label="Copy result JSON to clipboard"
              className="text-xs text-gray-400 hover:text-gray-300">Copy</button>
          </div>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
          <div className="mt-4">
            <EvidenceCard />
          </div>
        </div>
      )}

      {/* Quick reference */}
      <div className="mt-12 border border-gray-800 rounded-xl p-5 bg-gray-900/30">
        <h2 className="text-sm font-semibold text-white mb-3">About the RPCS-1 Translation Layer</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-gray-400">
          <div>
            <p className="text-sky-300 font-mono text-xs mb-1">AR Scale</p>
            <p>AR0 Direct → AR5 Refuse. Determined by ambiguity margin vs. risk threshold.</p>
          </div>
          <div>
            <p className="text-sky-300 font-mono text-xs mb-1">Risk Calibration</p>
            <p>Casual (0.15) → Safety-Critical (0.85). Higher risk = stricter collapse threshold.</p>
          </div>
          <div>
            <p className="text-sky-300 font-mono text-xs mb-1">Scoring Factors (HF-HATP v1.9)</p>
            <p>
              interpConf 0.30 · userEvid 0.25 · epistemic 0.15 · narrative 0.10 · semGap 0.10 ·
              transInteg 0.10 — translation-scoring factors, distinct from the five receiver
              primitives (TI, SG, FT, UE, AR).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
