'use client';

import { useState } from 'react';
import type { Recommendation, RecommendInput } from '@rpcs1/core';
import { TunerForm } from '@/components/TunerForm';
import { RecommendationOutput } from '@/components/RecommendationOutput';

export default function TunerPage() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: RecommendInput) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (res.status === 429) {
        setError('Rate limit reached. Free tier allows 10 requests per hour. Upgrade to Indie for unlimited access.');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }

      const result: Recommendation = await res.json();
      setRecommendation(result);

      // Scroll to results on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Agent Parameter Tuner</h1>
        <p className="text-gray-400 max-w-2xl">
          Describe your agent&apos;s task and environment. We&apos;ll compute parameter recommendations
          grounded in RPCS-1 receiver dynamics — no guessing, no trial and error.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <TunerForm onSubmit={handleSubmit} loading={loading} />
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
          SDK access requires a paid plan. Free tier: 5 calls/day.{' '}
          <a href="/pricing" className="text-sky-500 hover:text-sky-400">See pricing →</a>
        </p>
      </div>
    </div>
  );
}
