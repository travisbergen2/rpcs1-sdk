import { describe, it, expect } from 'vitest';
import {
  RECEIVER_TABLE,
  RECEIVER_TABLE_SCOPE,
  normalizeModelId,
  lookupReceiver,
  receiverDirectives,
  receiverEvidence,
  applyReceiverPosture,
} from '../src/receivers.js';
import { mapToParameters } from '../src/platforms.js';
import type { ReceiverProfile } from '../src/types.js';

const profile: ReceiverProfile = { TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 };

describe('normalizeModelId', () => {
  it('lowercases and collapses separators', () => {
    expect(normalizeModelId('Claude_Sonnet  4.6')).toBe('claude-sonnet-4.6');
  });

  it('strips vendor path prefixes', () => {
    expect(normalizeModelId('deepseek/deepseek-v4-pro')).toBe('deepseek-v4-pro');
    expect(normalizeModelId('meta/muse-spark-1.1')).toBe('muse-spark-1.1');
  });
});

describe('RECEIVER_TABLE integrity', () => {
  it('every entry carries an evidence grade and measurement date', () => {
    for (const e of RECEIVER_TABLE) {
      expect(['confirmatory', 'corroboration', 'self_measurement']).toContain(e.grade);
      expect(e.measured_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('LI-2 values are in [-1, 1] and OB in [0, 5]', () => {
    for (const e of RECEIVER_TABLE) {
      expect(e.li2).toBeGreaterThanOrEqual(-1);
      expect(e.li2).toBeLessThanOrEqual(1);
      expect(e.ob).toBeGreaterThanOrEqual(0);
      expect(e.ob).toBeLessThanOrEqual(5);
    }
  });

  it('ladder vectors have exactly five rungs', () => {
    for (const e of RECEIVER_TABLE) {
      expect(e.ladder).toHaveLength(5);
    }
  });

  it('OB is consistent with the ladder (highest modal-comply rung)', () => {
    for (const e of RECEIVER_TABLE) {
      let highestComply = 0;
      e.ladder.forEach((cls, i) => {
        if (cls === 'C') highestComply = i + 1;
      });
      expect(e.ob).toBe(highestComply);
    }
  });

  it('fringe rungs are exactly the CTC rungs of the ladder', () => {
    for (const e of RECEIVER_TABLE) {
      const ctcRungs = e.ladder
        .map((cls, i) => (cls === 'CTC' ? i + 1 : null))
        .filter((x): x is number => x !== null);
      expect([...e.fringe].sort()).toEqual(ctcRungs.sort());
    }
  });

  it('no two entries collide on a normalized alias', () => {
    const seen = new Map<string, string>();
    for (const e of RECEIVER_TABLE) {
      for (const a of [e.model_key, ...e.aliases]) {
        const norm = normalizeModelId(a);
        const owner = seen.get(norm);
        expect(owner === undefined || owner === e.model_key).toBe(true);
        seen.set(norm, e.model_key);
      }
    }
  });
});

describe('lookupReceiver', () => {
  it('finds entries by canonical key', () => {
    expect(lookupReceiver('claude-haiku-4.5')?.display_name).toBe('Claude Haiku 4.5');
  });

  it('finds entries by alias and vendor-prefixed id', () => {
    expect(lookupReceiver('deepseek/deepseek-v4-pro')?.vendor).toBe('DeepSeek');
    expect(lookupReceiver('claude-horchata-eap')?.display_name).toBe('Claude Opus 5');
  });

  it('matches date-pinned variants of a known key', () => {
    expect(lookupReceiver('claude-haiku-4-5-20251001')?.display_name).toBe('Claude Haiku 4.5');
  });

  it('does NOT match unrelated suffixed ids', () => {
    expect(lookupReceiver('claude-haiku-4-5-turbo')).toBeUndefined();
  });

  it('returns undefined for unmeasured models (no data ≠ no posture)', () => {
    expect(lookupReceiver('some-future-model-9000')).toBeUndefined();
  });

  it('resolves opus-latest to the measured 4.8 entry (the measured hazard)', () => {
    expect(lookupReceiver('opus-latest')?.display_name).toBe('Claude Opus 4.8');
  });
});

describe('receiverDirectives', () => {
  it('gives Terra a verbatim-verification warning', () => {
    const terra = lookupReceiver('gpt-5.6-terra')!;
    expect(receiverDirectives(terra).join(' ')).toMatch(/verbatim/i);
  });

  it('gives Flash a retry-protocol directive', () => {
    const flash = lookupReceiver('gemini-3.5-flash')!;
    expect(receiverDirectives(flash).join(' ')).toMatch(/retry protocol/i);
  });

  it('gives Opus 5 a narration expectation', () => {
    const opus5 = lookupReceiver('claude-opus-5')!;
    expect(receiverDirectives(opus5).join(' ')).toMatch(/meta-commentary/i);
  });

  it('requires licensing fences for ladder-refusing receivers', () => {
    for (const id of ['muse-spark-1.1', 'claude-opus-4.7', 'claude-opus-4.8', 'claude-sonnet-4.6']) {
      const e = lookupReceiver(id)!;
      expect(receiverDirectives(e).join(' ')).toMatch(/licensing frame/i);
    }
  });
});

describe('receiverEvidence', () => {
  it('carries grade, values, and the scope caveat', () => {
    const ev = receiverEvidence(lookupReceiver('glm-5.2')!);
    expect(ev.grade).toBe('confirmatory');
    expect(ev.li2).toBeCloseTo(0.867, 3);
    expect(ev.ob).toBe(3);
    expect(ev.fringe).toEqual([4]);
    expect(ev.scope).toBe(RECEIVER_TABLE_SCOPE);
  });
});

describe('applyReceiverPosture', () => {
  const base = mapToParameters(profile, 'anthropic');

  it('appends measured directives without dropping existing additions', () => {
    const out = applyReceiverPosture(base, 'claude-sonnet-4.6');
    const existing = base.system_prompt_additions ?? [];
    for (const a of existing) {
      expect(out.system_prompt_additions).toContain(a);
    }
    expect(out.system_prompt_additions!.length).toBeGreaterThan(existing.length);
    expect(out.receiver_evidence?.grade).toBe('confirmatory');
    expect(out.receiver_traits?.length).toBeGreaterThan(0);
  });

  it('deduplicates directives', () => {
    const out = applyReceiverPosture(base, 'claude-sonnet-4.6');
    const set = new Set(out.system_prompt_additions);
    expect(set.size).toBe(out.system_prompt_additions!.length);
  });

  it('returns parameters unchanged for unmeasured models', () => {
    const out = applyReceiverPosture(base, 'unmeasured-model-x');
    expect(out).toEqual(base);
    expect(out.receiver_evidence).toBeUndefined();
  });

  it('does not mutate the input parameters', () => {
    const before = JSON.stringify(base);
    applyReceiverPosture(base, 'claude-opus-4.8');
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('mapToParameters targetModel integration', () => {
  it('measured target model attaches evidence and directives', () => {
    const out = mapToParameters(profile, 'anthropic', { task_summary: 'summarize a report' }, 'claude-haiku-4-5-20251001');
    expect(out.receiver_evidence?.display_name).toBe('Claude Haiku 4.5');
    expect(out.system_prompt_additions!.join(' ')).toMatch(/output fences .* sufficient/i);
  });

  it('omitting targetModel preserves legacy behavior exactly', () => {
    const legacy = mapToParameters(profile, 'anthropic', { task_summary: 'summarize a report' });
    expect(legacy.receiver_evidence).toBeUndefined();
    expect(legacy.receiver_traits).toBeUndefined();
  });

  it('unmeasured targetModel falls back to vendor-level output', () => {
    const legacy = mapToParameters(profile, 'openai', { task_summary: 'summarize a report' });
    const out = mapToParameters(profile, 'openai', { task_summary: 'summarize a report' }, 'gpt-99-nonexistent');
    expect(out).toEqual(legacy);
  });
});
