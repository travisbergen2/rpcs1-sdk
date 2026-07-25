'use client';

/**
 * SprawlStrip — the discourse-level outline for sprawling prompts.
 *
 * Renders ONLY when analyzeSprawl flags the prompt (3+ asks, 2+ topics, a
 * perspective flip, or a contradiction) — same silent-until-real contract as
 * the chip strip. Shows: ask/topic headline, contradiction rows (the sharpest
 * finding, shown first), flip notes, and per-segment rows with a
 * send-just-this-part action.
 */

import type { SprawlResult, VendorId } from '@rpcs1/core';

export interface SprawlStripProps {
  result: SprawlResult;
  /** Hand a single segment off to a vendor (defaults to the panel's top pick) */
  onSendSegment: (segmentText: string, vendor?: VendorId) => void;
}

export default function SprawlStrip({ result, onSendSegment }: SprawlStripProps) {
  if (!result.sprawling) return null;

  const topicCount = Math.max(result.segments.length, 1);

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4" data-testid="sprawl-strip">
      <p className="text-sm text-neutral-300">
        This prompt carries{' '}
        <span className="text-neutral-100 font-medium">
          {result.totalAsks} {result.totalAsks === 1 ? 'ask' : 'asks'}
        </span>
        {topicCount > 1 && (
          <>
            {' '}across <span className="text-neutral-100 font-medium">{topicCount} topics</span>
          </>
        )}
        {' '}— it will land better in pieces.
      </p>

      {/* Contradictions first — the sharpest finding */}
      {result.conflicts.length > 0 && (
        <div className="mt-2 space-y-1.5" data-testid="conflict-rows">
          {result.conflicts.map((c, i) => (
            <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
              <span className="text-red-300 font-medium">
                &ldquo;{c.aText}&rdquo; ↔ &ldquo;{c.bText}&rdquo;
              </span>
              <span className="text-red-200/70"> — {c.why}</span>
            </div>
          ))}
        </div>
      )}

      {/* Perspective flips */}
      {result.flips.length > 0 && (
        <div className="mt-2 space-y-1" data-testid="flip-notes">
          {result.flips.map((f, i) => (
            <p key={i} className="text-xs text-amber-300/80">
              ↷ Viewpoint shifts at &ldquo;{result.text.slice(f.start, Math.min(f.end, f.start + 40))}…&rdquo; — {f.why}
            </p>
          ))}
        </div>
      )}

      {/* Segment outline with send-just-this actions */}
      {result.segments.length > 1 && (
        <ul className="mt-3 space-y-1.5" data-testid="segment-rows">
          {result.segments.map((seg, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-800/60 px-3 py-1.5">
              <span className="min-w-0 truncate text-xs text-neutral-400">
                <span className="mr-2 text-neutral-600">{i + 1}.</span>
                {seg.label}
                {seg.asks > 0 && (
                  <span className="ml-2 text-neutral-600">({seg.asks} {seg.asks === 1 ? 'ask' : 'asks'})</span>
                )}
              </span>
              <button
                onClick={() => onSendSegment(seg.text)}
                className="shrink-0 rounded-md border border-neutral-700 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-neutral-500 transition-colors"
              >
                send just this
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-neutral-600">
        Sending as one message is always fine too — you stay the author.
      </p>
    </div>
  );
}
