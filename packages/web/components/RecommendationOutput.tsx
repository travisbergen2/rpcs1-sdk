'use client';

import { useState } from 'react';
import type { Recommendation } from '@rpcs1/core';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface Props {
  recommendation: Recommendation;
}

type RegimeBadge = 'stable' | 'oscillation' | 'overload' | 'freeze';

function getRegimeBadge(regime: string): RegimeBadge {
  if (regime === 'near_oscillation') return 'oscillation';
  if (regime === 'near_overload')    return 'overload';
  if (regime === 'near_freeze')      return 'freeze';
  return 'stable';
}

function getRegimeLabel(regime: string): string {
  return {
    stable:           '✓ Stable',
    near_oscillation: '⚠ Near Oscillation',
    near_overload:    '⚠ Near Overload',
    near_freeze:      '⚠ Near Freeze',
  }[regime] ?? regime;
}

function CopyButton({ value }: { value: string | number | undefined }) {
  const [copied, setCopied] = useState(false);
  if (value === undefined) return null;
  const copy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 px-1.5 py-0.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors font-mono"
    >
      {copied ? '✓' : 'copy'}
    </button>
  );
}

function Param({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 font-mono">{label}</span>
      <span className="flex items-center text-sm text-gray-200 font-mono">
        {String(value)}
        <CopyButton value={value} />
      </span>
    </div>
  );
}

function PrimitiveMeter({ label, value, description }: { label: string; value: number; description: string }) {
  const pct = Math.round(value);
  const color =
    pct >= 70 ? 'bg-sky-500' :
    pct >= 40 ? 'bg-emerald-500' :
    'bg-amber-500';

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono text-gray-400 font-semibold">{label}</span>
        <span className="text-xs text-gray-500 font-mono">{pct}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{description}</p>
    </div>
  );
}

export function RecommendationOutput({ recommendation: rec }: Props) {
  const [showPrinciples, setShowPrinciples] = useState(false);
  const regime = getRegimeBadge(rec.predicted_regime);

  return (
    <div className="space-y-5">
      {/* Regime header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Results</h2>
        <div className="flex items-center gap-2">
          <Badge variant={regime}>{getRegimeLabel(rec.predicted_regime)}</Badge>
          <Badge variant="neutral">{rec.confidence} confidence</Badge>
        </div>
      </div>

      {/* Receiver profile */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Receiver Profile
          </h3>
          <div className="space-y-3">
            <PrimitiveMeter label="TI — Temporal Integration" value={rec.receiver_profile.TI} description="Context window strategy and max_tokens" />
            <PrimitiveMeter label="SG — Signal Gain"          value={rec.receiver_profile.SG} description="Inversely maps to temperature" />
            <PrimitiveMeter label="FT — Filtering Threshold"  value={rec.receiver_profile.FT} description="Tool use conservatism" />
            <PrimitiveMeter label="UE — Update Elasticity"    value={rec.receiver_profile.UE} description="Retry and grounding strategy" />
            <PrimitiveMeter label="AR — Ambiguity Resolution" value={rec.receiver_profile.AR} description="Commitment under uncertainty" />
          </div>
        </CardContent>
      </Card>

      {/* Platform parameters */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Platform Parameters
          </h3>
          <Param label="temperature"        value={rec.platform_parameters.temperature} />
          <Param label="max_tokens"         value={rec.platform_parameters.max_tokens} />
          <Param label="top_p"              value={rec.platform_parameters.top_p} />
          <Param label="model"              value={rec.platform_parameters.model_recommendation} />
          <Param label="tool_use_strategy"  value={rec.platform_parameters.tool_use_strategy} />
          <Param label="retry_strategy"     value={rec.platform_parameters.retry_strategy} />
          <Param label="context_strategy"   value={rec.platform_parameters.context_strategy} />
        </CardContent>
      </Card>

      {/* System prompt additions */}
      {rec.platform_parameters.system_prompt_additions?.length ? (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              System Prompt Additions
            </h3>
            <div className="space-y-2">
              {rec.platform_parameters.system_prompt_additions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <p className="text-sm text-gray-400 leading-relaxed flex-1 font-mono text-xs bg-gray-950 rounded p-2 border border-gray-800">
                    {s}
                  </p>
                  <CopyButton value={s} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Warnings */}
      {rec.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Warnings</h3>
          {rec.warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-300/80 leading-relaxed">{w}</p>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reasoning</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{rec.reasoning}</p>
        </CardContent>
      </Card>

      {/* IMM Principles — collapsible */}
      <div>
        <button
          onClick={() => setShowPrinciples(v => !v)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
        >
          <span>{showPrinciples ? '▾' : '▸'}</span>
          IMM principles applied ({rec.imm_principles_applied.length})
        </button>
        {showPrinciples && (
          <div className="mt-3 space-y-1">
            {rec.imm_principles_applied.map((p, i) => (
              <p key={i} className="text-xs text-gray-600 font-mono pl-3 border-l border-gray-800">{p}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
