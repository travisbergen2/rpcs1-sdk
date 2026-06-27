'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RecommendInput, Recommendation } from '@rpcs1/core';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type DemoKey = 'support' | 'coding' | 'research';

const DEMOS: Record<
  DemoKey,
  {
    title: string;
    description: string;
    input: RecommendInput;
  }
> = {
  support: {
    title: 'Support copilot',
    description: 'Refunds, billing disputes, and policy exceptions under queue pressure.',
    input: {
      task: {
        task_summary: 'Customer support agent handling refunds, billing disputes, and policy exceptions',
        domain: 'customer_support',
      },
      environment: {
        entropy: 'dynamic',
        predictability: 'somewhat_predictable',
        stakes: 'high',
        context_relevance: 'medium',
        commitment_style: 'cautious',
      },
      target_platform: 'anthropic',
    },
  },
  coding: {
    title: 'Coding agent',
    description: 'Repo edits, tests, and pull requests in a changing codebase.',
    input: {
      task: {
        task_summary: 'Coding agent that can inspect a repo, edit files, run tests, and open pull requests',
        domain: 'coding',
      },
      environment: {
        entropy: 'moderate',
        predictability: 'somewhat_predictable',
        stakes: 'medium',
        context_relevance: 'long',
        commitment_style: 'balanced',
      },
      target_platform: 'openai',
    },
  },
  research: {
    title: 'Research agent',
    description: 'Long-context synthesis with a careful, bridge-first response.',
    input: {
      task: {
        task_summary: 'Research agent synthesizing conflicting technical sources into a cautious recommendation',
        domain: 'research',
      },
      environment: {
        entropy: 'stable',
        predictability: 'highly_predictable',
        stakes: 'medium',
        context_relevance: 'long',
        commitment_style: 'cautious',
      },
      target_platform: 'generic',
    },
  },
};

function getBestNextCheck(rec: Recommendation): string {
  const warning = rec.warnings[0]?.toLowerCase() ?? '';
  const posture = rec.platform_parameters.translation_posture;

  if (warning.includes('oscillation')) return 'Retest three ambiguous cases and one escalation path.';
  if (warning.includes('overload')) return 'Retest one high-stakes handoff with tighter gating.';
  if (warning.includes('freeze')) return 'Retest one safe escalation path and lower the friction.';
  if (posture === 'face_preserving') return 'Retest one emotionally loaded support reply.';
  if (posture === 'bridging') return 'Retest one technical explanation with a plain-language bridge.';
  if (posture === 'minimal_clarifying') return 'Retest one case with a single missing detail.';
  return 'Run the same workflow on one harder edge case.';
}

function getStatusTone(status: Recommendation['predicted_regime']) {
  switch (status) {
    case 'stable':
      return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
    case 'near_oscillation':
      return 'text-amber-300 border-amber-500/25 bg-amber-500/10';
    case 'near_overload':
      return 'text-orange-300 border-orange-500/25 bg-orange-500/10';
    case 'near_freeze':
      return 'text-blue-300 border-blue-500/25 bg-blue-500/10';
  }
}

export function HomepageLiveDemo() {
  const [selected, setSelected] = useState<DemoKey>('support');
  const [result, setResult] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function runDemo(key: DemoKey) {
    setSelected(key);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEMOS[key].input),
      });

      if (!res.ok) {
        throw new Error('Could not run the live demo.');
      }

      const json = (await res.json()) as Recommendation;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the live demo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runDemo('support');
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const active = DEMOS[selected];
  const statusClass = result ? getStatusTone(result.predicted_regime) : 'text-gray-300 border-gray-700 bg-gray-900/80';
  const config = result
    ? [
        result.platform_parameters.tool_use_strategy,
        result.platform_parameters.context_strategy,
      ]
      .filter(Boolean)
      .join(' · ')
    : 'Running...';

  function scrollToProof() {
    document.getElementById('proof-signal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-950/90 p-5 sm:p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(56,189,248,0.16), transparent 25%), radial-gradient(circle at 90% 30%, rgba(245,158,11,0.12), transparent 20%), radial-gradient(circle at 50% 100%, rgba(16,185,129,0.08), transparent 20%)',
        }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-sky-400 mb-2">live demo</p>
            <h3 className="text-xl font-semibold text-white">Try one workflow in under a minute.</h3>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              Pick a preset, run RPCS-1, and see the status, configuration, language mode, and next check.
            </p>
          </div>
          <span className={cn('rounded-full border px-3 py-1 text-xs font-mono', loading ? 'text-gray-300 border-gray-700 bg-gray-900' : 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10')}>
            {loading ? 'running' : 'ready'}
          </span>
        </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(Object.keys(DEMOS) as DemoKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => void runDemo(key)}
            className={cn(
              'rounded-xl border px-3 py-3 text-left transition-colors',
              selected === key
                ? 'border-sky-400/60 bg-sky-500/15'
                : 'border-gray-800 bg-gray-900/70 hover:border-gray-700'
            )}
          >
            <p className="text-sm font-semibold text-white">{DEMOS[key].title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{DEMOS[key].description}</p>
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              Status <span className={cn('ml-1 rounded px-1.5 py-0.5 font-semibold', statusClass)}>{result?.predicted_regime ?? '...'}</span>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              Configuration <span className="ml-1 text-gray-200">{config}</span>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              Language mode <span className="ml-1 text-amber-300">{result?.platform_parameters.translation_posture ?? '...'}</span>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              Confidence <span className="ml-1 text-sky-300">{result?.confidence ?? '...'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
            <p className="text-xs font-mono text-sky-400 mb-2">Best next check</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {result ? getBestNextCheck(result) : 'Running the live demo now...'}
            </p>
          </div>

          {result?.warnings?.[0] && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-mono text-amber-400 mb-2">First warning</p>
              <p className="text-sm text-gray-300 leading-relaxed">{result.warnings[0]}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
            <span>{active.title}</span>
            <Link href={`/tuner?preset=${selected}`} className="text-sky-400 hover:text-sky-300 underline underline-offset-4">
              Open full tuner →
            </Link>
          </div>
        </div>
      )}

      <Button type="button" variant="cta" size="lg" className="mt-5 w-full" loading={loading} onClick={() => void runDemo(selected)}>
        Run live demo
      </Button>

        <button
          type="button"
          onClick={scrollToProof}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/15"
        >
          See proof ↓
        </button>
      </div>
    </div>
  );
}
