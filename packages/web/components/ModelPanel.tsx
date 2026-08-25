'use client';

/**
 * ModelPanel — top-3 receiver persona cards for the current reading, with
 * Provisional badges, honest "not yet measured" stat cells, and the ranking
 * heuristic one click deep. Registered decisions #3 (two-step: reading first,
 * then this panel) and #4 (top-3 + show-more-unranked).
 *
 * Claim discipline enforced here:
 *   - grade badge is always rendered — no unbadged cards.
 *   - stat cells render "not yet measured" for null values; trait numbers are
 *     never displayed (internal ordering only).
 */

import { useMemo, useState } from 'react';
import { rankPersonas, type PersonaCard, type ForkKind } from '@rpcs1/core';

const AVATAR: Record<string, string> = {
  claude: '📖', chatgpt: '💬', perplexity: '🔎', gemini: '🧭', grok: '⚡', copilot: '📋',
};

function GradeBadge({ grade }: { grade: 'measured' | 'provisional' }) {
  return grade === 'measured' ? (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-emerald-500/15 text-emerald-300">measured</span>
  ) : (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-neutral-700 text-neutral-400" title="Based on vendor positioning and community-documented behavior — not a measurement.">provisional</span>
  );
}

function StatRows({ card }: { card: PersonaCard }) {
  return (
    <ul className="mt-2 space-y-0.5">
      {card.stats.map((s) => (
        <li key={s.label} className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-neutral-400">{s.label}</span>
          {s.value === null ? (
            <span className="text-neutral-400 italic">not yet measured</span>
          ) : (
            <span className="text-neutral-300" title={`${s.source} (${s.asOf})`}>{s.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface ModelPanelProps {
  /** Fork kind of the locked reading, or 'as_written' for clean prompts */
  kind: ForkKind | 'as_written';
  onPick: (vendor: string) => void;
  /** Vendors that need copy & paste (from the hand-off capability table) */
  clipboardVendors: Set<string>;
}

export default function ModelPanel({ kind, onPick, clipboardVendors }: ModelPanelProps) {
  const [showMore, setShowMore] = useState(false);
  const panel = useMemo(() => rankPersonas(kind), [kind]);

  return (
    <div data-testid="model-panel">
      <p className="mb-2 text-sm text-neutral-400">
        Send it right — receivers that fit this reading best. Opens your own app; you hit send:
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {panel.top.map(({ card, why }) => (
          <button
            key={card.vendor}
            onClick={() => onPick(card.vendor)}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-emerald-400/40 hover:bg-white/[0.05] hover:shadow-[0_0_30px_-12px_rgba(16,185,129,0.3)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg" aria-hidden>{AVATAR[card.vendor] ?? '🤖'}</span>
              <GradeBadge grade={card.grade} />
            </div>
            <span className="mt-1.5 text-sm font-medium text-neutral-100">{card.title}</span>
            <span className="text-xs text-neutral-400">{card.describes}{clipboardVendors.has(card.vendor) ? ' · copy & paste' : ''}</span>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{card.blurb}</p>
            <p className="mt-1.5 text-[11px] text-neutral-400">{why}</p>
            <StatRows card={card} />
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={() => setShowMore((v) => !v)}
          className="text-xs text-neutral-400 hover:text-neutral-400"
        >
          {showMore ? 'fewer options' : `more options (${panel.unranked.length}, unranked)`}
        </button>
        <details className="text-xs text-neutral-400">
          <summary className="cursor-pointer hover:text-neutral-400">why this order?</summary>
          <p className="mt-1 max-w-prose text-neutral-400">{panel.heuristic}</p>
        </details>
      </div>

      {showMore && (
        <div className="mt-2 flex flex-wrap gap-2" data-testid="unranked-row">
          {panel.unranked.map((card) => (
            <button
              key={card.vendor}
              onClick={() => onPick(card.vendor)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-600 transition-colors"
              title={card.blurb}
            >
              {AVATAR[card.vendor]} {card.title}{clipboardVendors.has(card.vendor) ? ' · copy & paste' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
