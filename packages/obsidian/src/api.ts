// ── Loop API client (pure: no Obsidian imports — fully unit-testable) ─────────
//
// Talks to the Explicit Formula loop endpoint (POST /api/translate,
// tool: "loop" | "loop_answer") and re-verifies the ratchet CLIENT-SIDE:
// the server already enforces locked-line survival mechanically, but this
// client re-checks and mechanically repairs anyway (defense in depth — a
// buggy or tampered response still cannot regress locked meaning).

import {
  verifyRatchet,
  repairRatchet,
  spansFromTexts,
  normalizeSpanText,
  type LoopSpan,
} from '@rpcs1/core';

export interface LoopRound {
  spans: LoopSpan[];
  /** Server reported it had to mechanically repair the model's output. */
  serverRepaired: boolean;
  /** THIS client had to repair the server's response (should be rare). */
  clientRepaired: boolean;
}

export class LoopClientError extends Error {
  readonly kind: 'model_unavailable' | 'budget_exhausted' | 'transient' | 'bad_response';
  constructor(kind: LoopClientError['kind'], message: string) {
    super(message);
    this.kind = kind;
    this.name = 'LoopClientError';
  }
}

interface LoopApiResponse {
  spans?: Array<{ id: string; text: string; status: 'kept' | 'revised' }>;
  repaired?: boolean;
  violations?: string[];
  error?: string;
  message?: string;
}

const FRIENDLY: Record<string, { kind: LoopClientError['kind']; msg: string }> = {
  model_unavailable: { kind: 'model_unavailable', msg: 'The interpretation service is not available right now — try again in a bit.' },
  budget_exhausted: { kind: 'budget_exhausted', msg: 'The free daily budget is used up — try again later.' },
  model_error: { kind: 'transient', msg: 'The model hiccuped — try again.' },
  unparseable: { kind: 'transient', msg: 'The model returned something unusable — try again.' },
};

export interface LoopClientOptions {
  /** Base site URL, e.g. https://www.explicitformula.com (no trailing slash needed). */
  endpoint: string;
  /** Injectable fetch for testing. */
  fetchImpl?: typeof fetch;
}

export class LoopClient {
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: LoopClientOptions) {
    this.base = opts.endpoint.replace(/\/+$/, '');
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async post(body: Record<string, unknown>): Promise<LoopApiResponse> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}/api/translate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new LoopClientError('transient', 'Network hiccup — try again.');
    }
    let data: LoopApiResponse;
    try {
      data = (await res.json()) as LoopApiResponse;
    } catch {
      throw new LoopClientError('bad_response', 'The service returned something unreadable.');
    }
    if (!res.ok) {
      const f = data.error ? FRIENDLY[data.error] : undefined;
      if (f) throw new LoopClientError(f.kind, data.message || f.msg);
      throw new LoopClientError('transient', data.message || `Request failed (${res.status}).`);
    }
    return data;
  }

  /** Round 1: fresh interpretation of the dump. */
  async startRound(
    dump: string,
    contextSnippets?: ReadonlyArray<{ source: string; text: string }>,
  ): Promise<LoopRound> {
    const data = await this.post({
      tool: 'loop',
      text: dump,
      ...(contextSnippets && contextSnippets.length > 0 ? { contextSnippets } : {}),
    });
    if (!data.spans || data.spans.length === 0) {
      throw new LoopClientError('bad_response', 'No interpretation came back — try again.');
    }
    return { spans: data.spans, serverRepaired: Boolean(data.repaired), clientRepaired: false };
  }

  /**
   * Round n: re-derive unlocked lines. Locked lines are re-verified here
   * against what the server returned; on violation the repair is applied
   * locally and flagged.
   */
  async nextRound(
    dump: string,
    prevSpans: ReadonlyArray<LoopSpan>,
    electedIds: ReadonlyArray<string>,
    contextSnippets?: ReadonlyArray<{ source: string; text: string }>,
  ): Promise<LoopRound> {
    const data = await this.post({
      tool: 'loop',
      text: dump,
      spans: prevSpans,
      electedIds,
      ...(contextSnippets && contextSnippets.length > 0 ? { contextSnippets } : {}),
    });
    if (!data.spans || data.spans.length === 0) {
      throw new LoopClientError('bad_response', 'No interpretation came back — try again.');
    }
    const elected = prevSpans.filter((s) => electedIds.includes(s.id));
    const items = data.spans.map((s) => ({ text: s.text, kept: s.status === 'kept' }));
    const check = verifyRatchet(elected, items);
    if (check.ok) {
      return { spans: data.spans, serverRepaired: Boolean(data.repaired), clientRepaired: false };
    }
    const repairedItems = repairRatchet(prevSpans, electedIds, items);
    const electedNorm = new Set(elected.map((s) => normalizeSpanText(s.text)));
    const spans = spansFromTexts(
      repairedItems.map((i) => ({ text: i.text, kept: electedNorm.has(normalizeSpanText(i.text)) })),
    );
    return { spans, serverRepaired: Boolean(data.repaired), clientRepaired: true };
  }

  /** Optional in-app answer for a converged prompt. */
  async answer(prompt: string): Promise<string> {
    const data = await this.post({ tool: 'loop_answer', prompt });
    const answer = (data as { answer?: string }).answer;
    if (typeof answer !== 'string' || !answer.trim()) {
      throw new LoopClientError('bad_response', 'No answer came back — copy the prompt into your own AI.');
    }
    return answer;
  }
}

/** Assemble the final prompt from spans (mirrors core's assemblePrompt). */
export function assembleFinalPrompt(spans: ReadonlyArray<LoopSpan>): string {
  return spans
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ');
}
