'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { EvidenceCard } from '@/components/EvidenceCard';
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
        setError('Rate limit reached — 10 requests per hour. Please try again in a bit.');
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
    <TunerFrame
      note={
        isPresetKey(preset) && (
          <p className="mt-3 text-sm text-sky-400">
            Running the {preset} example automatically. You can adjust any field and run it again.
          </p>
        )
      }
      alert={
        error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )
      }
      form={<TunerForm onSubmit={handleSubmit} loading={loading} defaultValues={defaultValues} />}
      results={recommendation ? <RecommendationOutput recommendation={recommendation} /> : <ResultsPlaceholder />}
    />
  );
}

/**
 * The page's static frame — heading, evidence card, the two panels and the
 * rate-limit note. Rendered by the live page AND by the Suspense fallback so
 * the server HTML already carries the page's full height.
 *
 * Why: `useSearchParams` makes this tree client-render, and a `null` fallback
 * shipped an empty <main>. The footer painted at the top of the screen, then
 * jumped 400+ px once the tool mounted — CLS 0.50 on the 2026-09-12 audit,
 * the only failing performance score on the site.
 */
function TunerFrame({
  note,
  alert,
  form,
  results,
}: {
  note?: React.ReactNode;
  alert?: React.ReactNode;
  form: React.ReactNode;
  results: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Run the tuner.</h1>
        <p className="text-gray-400 max-w-2xl">
          Describe one workflow and its operating conditions. RPCS-1 will flag likely quality risks,
          recommend a runtime posture, and show the implementation settings behind it.
        </p>
        {note}
        <div className="mt-6">
          <EvidenceCard compact />
        </div>
      </div>

      {alert}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">{form}</div>

        <div id="results">{results}</div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-800">
        <p className="mt-3 text-xs text-gray-400">
          Web tuner: 10 recommendations per hour. Python SDK: 5 free calls per day.{' '}
          <a href="/pricing" className="text-sky-500 underline underline-offset-4 hover:text-sky-400">See pricing →</a>
        </p>
      </div>
    </div>
  );
}

function ResultsPlaceholder() {
  return (
    <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-400">
      <div className="text-4xl mb-3">⟳</div>
      <p className="text-sm">Complete the assessment to see the diagnosis and recommendations.</p>
      <p className="text-xs mt-2 text-gray-400">
        Results include likely failure mode, plain-English reasoning, receiver profile,
        and platform-specific implementation settings.
      </p>
    </div>
  );
}

/**
 * Exact-height stand-in until the client renders: the same frame with a real,
 * inert form (identical layout, not focusable, hidden from assistive tech) and
 * the same results placeholder. Only the one-line preset note is absent, so a
 * `?preset=` visit shifts by that line and nothing else.
 */
function TunerFallback() {
  return (
    <TunerFrame
      form={
        <div inert>
          <TunerForm onSubmit={async () => undefined} loading={false} />
        </div>
      }
      results={<ResultsPlaceholder />}
    />
  );
}

export default function TunerPage() {
  return (
    <Suspense fallback={<TunerFallback />}>
      <TunerPageContent />
    </Suspense>
  );
}
