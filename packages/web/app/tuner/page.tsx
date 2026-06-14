'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import type { Recommendation, RecommendInput } from '@rpcs1/core';
import { TunerForm } from '@/components/TunerForm';
import { RecommendationOutput } from '@/components/RecommendationOutput';

const PRESETS = {
  support: {
    task_summary: 'Customer support agent handling refunds, billing disputes, and policy exceptions',
    domain: 'customer_support',
    entropy: 'dynamic',
    predictability: 'somewhat_predictable',
    stakes: 'high',
    context_relevance: 'medium',
    commitment_style: 'cautious',
    target_platform: 'anthropic',
  },
  coding: {
    task_summary: 'Coding agent that can inspect a repo, edit files, run tests, and open pull requests',
    domain: 'coding',
    entropy: 'moderate',
    predictability: 'somewhat_predictable',
    stakes: 'medium',
    context_relevance: 'long',
    commitment_style: 'balanced',
    target_platform: 'openai',
  },
  research: {
    task_summary: 'Research agent synthesizing conflicting technical sources into a cautious recommendation',
    domain: 'research',
    entropy: 'stable',
    predictability: 'highly_predictable',
    stakes: 'medium',
    context_relevance: 'long',
    commitment_style: 'cautious',
    target_platform: 'generic',
  },
} satisfies Record<string, Partial<Parameters<typeof TunerForm>[0]['defaultValues']>>;

function isPresetKey(value: string | null): value is keyof typeof PRESETS {
  return value !== null && value in PRESETS;
}

function TunerPageContent() {
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset');
  const defaultValues = isPresetKey(preset) ? PRESETS[preset] : undefined;
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRanPreset = useRef(false);
  const trackedView = useRef(false);

  const handleSubmit = useCallback(async (
    input: RecommendInput,
    source: 'manual' | 'preset_auto' = 'manual',
  ) => {
    setLoading(true);
    setError(null);
    track('Tuner Submitted', {
      source,
      preset: isPresetKey(preset) ? preset : 'none',
      platform: input.target_platform,
      domain: input.task.domain ?? 'unspecified',
    });

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (res.status === 429) {
        track('Tuner Failed', { reason: 'rate_limit', source });
        setError('Rate limit reached. Free tier allows 10 requests per hour. Upgrade to Indie for unlimited access.');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        track('Tuner Failed', { reason: 'api_error', status: res.status, source });
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }

      const result: Recommendation = await res.json();
      setRecommendation(result);
      track('Recommendation Generated', {
        source,
        preset: isPresetKey(preset) ? preset : 'none',
        platform: input.target_platform,
        regime: result.predicted_regime,
        confidence: result.confidence,
      });

      // Scroll to results on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch {
      track('Tuner Failed', { reason: 'network_error', source });
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    track('Tuner Viewed', {
      preset: isPresetKey(preset) ? preset : 'none',
    });
  }, [preset]);

  useEffect(() => {
    if (!isPresetKey(preset) || autoRanPreset.current) return;
    autoRanPreset.current = true;

    const values = PRESETS[preset];
    void handleSubmit({
      task: {
        task_summary: values.task_summary,
        domain: values.domain,
      },
      environment: {
        entropy: values.entropy,
        predictability: values.predictability,
        stakes: values.stakes,
        context_relevance: values.context_relevance,
        commitment_style: values.commitment_style,
      },
      target_platform: values.target_platform,
    }, 'preset_auto');
  }, [handleSubmit, preset]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Agent Parameter Tuner</h1>
        <p className="text-gray-400 max-w-2xl">
          Describe your agent&apos;s task and environment. We&apos;ll compute parameter recommendations
          grounded in RPCS-1 receiver dynamics — no guessing, no trial and error.
        </p>
        {isPresetKey(preset) && (
          <p className="mt-3 text-sm text-sky-400">
            Running the {preset} example automatically. You can adjust any field and run it again.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <TunerForm onSubmit={handleSubmit} loading={loading} defaultValues={defaultValues} />
        </div>

        <div id="results">
          {recommendation ? (
            <RecommendationOutput recommendation={recommendation} />
          ) : (
            <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-600">
              <div className="text-4xl mb-3">⟳</div>
              <p className="text-sm">Fill in the form and submit to see recommendations.</p>
              <p className="text-xs mt-2 text-gray-700">
                Results include receiver profile (TI, SG, FT, UE, AR),
                platform parameters, predicted regime, and reasoning.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-800">
        <h2 className="text-sm font-semibold text-gray-500 mb-4">Install the Python SDK</h2>
        <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 font-mono text-sm text-gray-300">
          pip install rpcs1
        </div>
        <p className="mt-3 text-xs text-gray-600">
          Web tuner: 10 recommendations per hour. Python SDK: 5 free calls per day.{' '}
          <a href="/pricing" className="text-sky-500 hover:text-sky-400">See pricing →</a>
        </p>
      </div>
    </div>
  );
}

export default function TunerPage() {
  return (
    <Suspense fallback={null}>
      <TunerPageContent />
    </Suspense>
  );
}
