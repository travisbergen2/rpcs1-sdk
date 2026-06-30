'use client';

import { useState, useCallback } from 'react';

export default function TranslatorPage() {
  const [activeTab, setActiveTab] = useState('interpret');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    { label: 'Okay', IC: 0.80, UE: 0.20, EC: 0.50, NM: 0.50, SG: 0.10, TI: 1.00 },
    { label: 'Frustrated', IC: 0.40, UE: 0.90, EC: 0.50, NM: 0.50, SG: 0.70, TI: 0.90 },
  ], null, 2));
  const [scoreRisk, setScoreRisk] = useState('casual');

  const callApi = useCallback(async (tool, body) => {
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
    } catch (e) {
      setError(e.message);
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

  const TabContent = () => {
    switch (activeTab) {
      case 'interpret':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Message to interpret</label>
            <input value={interpretText} onChange={(e) => setInterpretText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Risk:</label>
              <select value={interpretRisk} onChange={(e) => setInterpretRisk(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                {['casual','advice','high-stakes','safety-critical'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => callApi('interpret', { text: interpretText, risk: interpretRisk })}
                className="ml-auto bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold">
                {loading ? '...' : 'Interpret'}
              </button>
            </div>
          </div>
        );
      case 'normalize':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Fragmented text</label>
            <textarea value={normalizeText} onChange={(e) => setNormalizeText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm min-h-[80px]" />
            <button onClick={() => callApi('normalize', { text: normalizeText })}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold">
              {loading ? '...' : 'Normalize'}
            </button>
          </div>
        );
      case 'split':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Mixed intents</label>
            <textarea value={splitText} onChange={(e) => setSplitText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm min-h-[80px]" />
            <button onClick={() => callApi('split', { text: splitText })}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold">
              {loading ? '...' : 'Split'}
            </button>
          </div>
        );
      case 'rewrite':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Text to rewrite</label>
            <textarea value={rewriteText} onChange={(e) => setRewriteText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm min-h-[80px]" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Style:</label>
              <select value={rewriteStyle} onChange={(e) => setRewriteStyle(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                {['technical','plain','socially_gentle','concise','detailed','direct'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => callApi('rewrite', { text: rewriteText, style: rewriteStyle })}
                className="ml-auto bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold">
                {loading ? '...' : 'Rewrite'}
              </button>
            </div>
          </div>
        );
      case 'route':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Task type:</label>
              <select value={routeType} onChange={(e) => setRouteType(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                {['code','creative_writing','analysis','chat','translation','reasoning','planning','emotional'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input value={routeObjective} onChange={(e) => setRouteObjective(e.target.value)}
              placeholder="Objective (optional)"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm" />
            <button onClick={() => callApi('route', { task_type: routeType, objective: routeObjective })}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold">
              {loading ? '...' : 'Route'}
            </button>
          </div>
        );
      case 'score':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Candidates JSON</label>
            <textarea value={scoreCandidates} onChange={(e) => setScoreCandidates(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono min-h-[180px]" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Risk:</label>
              <select value={scoreRisk} onChange={(e) => setScoreRisk(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                {['casual','advice','high-stakes','safety-critical'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => {
                try { JSON.parse(scoreCandidates); } catch { setError('Invalid JSON'); return; }
                callApi('score', { candidates: JSON.parse(scoreCandidates), risk: scoreRisk });
              }}
                className="ml-auto bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold">
                {loading ? '...' : 'Score'}
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
          <a href="/docs/translation-layer" className="text-sky-400 hover:underline">HF-HATP v1.9</a> protocol.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800 pb-2">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-sky-500/10 text-sky-300 border-b-2 border-sky-500' : 'text-gray-500 hover:text-gray-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-5">
        <TabContent />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-5">
          <p className="text-red-400 text-sm font-mono">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Result</h3>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
              className="text-xs text-gray-500 hover:text-gray-300">Copy</button>
          </div>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Quick reference */}
      <div className="mt-12 border border-gray-800 rounded-xl p-5 bg-gray-900/30">
        <h3 className="text-sm font-semibold text-white mb-3">About the RPCS-1 Translation Layer</h3>
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
            <p className="text-sky-300 font-mono text-xs mb-1">Reference Weights</p>
            <p>IC=0.30, UE=0.25, EC=0.15, NM=0.10, SG=0.10, TI=0.10</p>
          </div>
        </div>
      </div>
    </div>
  );
}
