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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Run the free sample.</h1>
        <p className="text-gray-400 max-w-2xl">
          Describe one workflow and its operating conditions. RPCS-1 will flag likely quality risks,
          recommend a runtime posture, and show the implementation settings behind it.
        </p>
        {isPresetKey(preset) && (
          <p className="mt-3 text-sm text-sky-400">
            Running the {preset} example automatically. You can adjust any field and run it again.
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="/api/checkout?tier=diagnostic"
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 shadow-lg shadow-amber-500/20"
          >
            Buy the written diagnostic
          </a>
          <a
            href="/diagnostic"
            className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-sky-500/40 hover:text-white"
          >
            Submit the brief
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-500 max-w-2xl">
          Free tuner results are directional. The paid diagnostic is a written report with a clearer
          failure-mode diagnosis and implementation settings for your team.
        </p>
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
              <p className="text-sm">Complete the assessment to see the diagnosis and recommendations.</p>
              <p className="text-xs mt-2 text-gray-700">
                Results include likely failure mode, plain-English reasoning, receiver profile,
                and platform-specific implementation settings.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-800">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 sm:p-7">
          <p className="text-xs font-mono text-amber-400 mb-3">sales tunnel</p>
          <h2 className="text-xl font-semibold text-white mb-3">Need the written memo?</h2>
          <p className="text-gray-400 max-w-2xl">
            The free tuner is for fast iteration. The paid diagnostic gives you a report you can hand to a team,
            with the failure mode, recommended posture, and implementation notes already organized.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <a
              href="/api/checkout?tier=diagnostic"
              className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 shadow-lg shadow-amber-500/20"
            >
              Buy the diagnostic
            </a>
            <a
              href="/pricing#diagnostic"
              className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-sky-500/40 hover:text-white"
            >
              Review the offer
            </a>
          </div>
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
