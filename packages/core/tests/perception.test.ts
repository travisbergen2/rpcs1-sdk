import { describe, it, expect } from 'vitest';
import { interpretWithModel, interpret } from '../src/translator';
import {
  MockBackend,
  AnthropicBackend,
  sanitizePerception,
  type PerceptionResult,
} from '../src/perception';
import { scoreIntake } from '../src/intake';

// ── Fixtures ─────────────────────────────────────────────────────────

const CLEAR: PerceptionResult = {
  entities: [],
  intents: [{ type: 'instruction', confidence: 0.92 }],
  readings: [
    { label: 'literal_request', paraphrase: 'Please summarize the Q3 report.', interpConf: 0.9, userEvid: 0.85, epistemic: 0.8, narrative: 0.7, semGap: 0.05, transInteg: 0.98 },
    { label: 'alt', paraphrase: 'Something else entirely.', interpConf: 0.2, userEvid: 0.2, epistemic: 0.4, narrative: 0.4, semGap: 0.6, transInteg: 0.6 },
  ],
  canonicalTranslation: 'Please summarize the Q3 report.',
};

const AMBIGUOUS: PerceptionResult = {
  entities: [
    {
      original: 'she',
      category: 'pronoun',
      candidates: [
        { text: '[your manager]', confidence: 0.45 },
        { text: '[the client]', confidence: 0.4 },
      ],
    },
  ],
  intents: [{ type: 'question', confidence: 0.6 }],
  readings: [
    { label: 'asking_about_manager', paraphrase: 'Did the manager approve it?', interpConf: 0.45, userEvid: 0.4, epistemic: 0.5, narrative: 0.55, semGap: 0.5, transInteg: 0.6 },
    { label: 'asking_about_client', paraphrase: 'Did the client approve it?', interpConf: 0.42, userEvid: 0.38, epistemic: 0.5, narrative: 0.55, semGap: 0.5, transInteg: 0.6 },
  ],
  canonicalTranslation: 'Did [ambiguous: your manager / the client] approve it?',
};

// ── sanitizePerception ───────────────────────────────────────────────

describe('sanitizePerception (untrusted model output → validated data)', () => {
  it('clamps out-of-range factor values into [0,1]', () => {
    const r = sanitizePerception(
      { readings: [{ label: 'x', paraphrase: 'p', interpConf: 7, userEvid: -3, epistemic: 0.5, narrative: 0.5, semGap: 0.5, transInteg: 2 }] },
      'orig',
    );
    expect(r.readings[0].interpConf).toBe(1);
    expect(r.readings[0].userEvid).toBe(0);
    expect(r.readings[0].transInteg).toBe(1);
  });
  it('throws when the payload has no usable readings', () => {
    expect(() => sanitizePerception({ readings: [] }, 'orig')).toThrow();
    expect(() => sanitizePerception(null, 'orig')).toThrow();
  });
  it('defaults missing canonical translation to the original text', () => {
    const r = sanitizePerception({ readings: CLEAR.readings }, 'the original');
    expect(r.canonicalTranslation).toBe('the original');
  });
  it('coerces unknown intent types to general and supplies a default intent', () => {
    const r = sanitizePerception({ readings: CLEAR.readings, intents: [{ type: 'exfiltrate', confidence: 0.9 }] }, 'x');
    expect(r.intents[0].type).toBe('general');
    const r2 = sanitizePerception({ readings: CLEAR.readings }, 'x');
    expect(r2.intents[0]).toEqual({ type: 'general', confidence: 0.5 });
  });
  it('drops entities without a surface form and caps list sizes', () => {
    const entities = Array.from({ length: 20 }, (_, i) => ({ original: `e${i}`, category: 'pronoun', candidates: [{ text: 't', confidence: 0.5 }] }));
    const r = sanitizePerception({ readings: CLEAR.readings, entities: [...entities, { category: 'pronoun', candidates: [] }] }, 'x');
    expect(r.entities.length).toBeLessThanOrEqual(12);
    expect(r.entities.every((e) => e.original.length > 0)).toBe(true);
  });
});

// ── interpretWithModel: decision layer stays deterministic ───────────

describe('interpretWithModel (model proposes, deterministic RPCS-1 disposes)', () => {
  it('clear input collapses with low AR level and no clarifying questions', async () => {
    const out = await interpretWithModel('Please summarize the Q3 report.', new MockBackend(CLEAR));
    expect(out.engine).toBe('mock');
    expect(['AR0', 'AR1']).toContain(out.ar_level);
    expect(out.clarifying_questions).toEqual([]);
    expect(out.canonical_translation).toBe('Please summarize the Q3 report.');
  });

  it('ambiguous input refuses to collapse and asks about the referent', async () => {
    const out = await interpretWithModel('did she approve it?', new MockBackend(AMBIGUOUS));
    expect(out.playback_required).toBe(true);
    expect(['AR2', 'AR3', 'AR4', 'AR5']).toContain(out.ar_level);
    expect(out.clarifying_questions.join(' ')).toMatch(/"she"/);
    expect(out.recovered_entities[0].alternatives.length).toBe(1);
  });

  it('is deterministic given identical perception output', async () => {
    const backend = new MockBackend(AMBIGUOUS);
    const a = await interpretWithModel('did she approve it?', backend);
    const b = await interpretWithModel('did she approve it?', backend);
    expect(a).toEqual(b);
  });

  it('risk category changes the decision, not the perception', async () => {
    const casual = await interpretWithModel('x', new MockBackend(CLEAR), { risk: 'casual' });
    const critical = await interpretWithModel('x', new MockBackend(CLEAR), { risk: 'safety-critical' });
    // Same candidates; stricter threshold must not loosen the outcome.
    expect(critical.clarifying_questions.length).toBeGreaterThanOrEqual(casual.clarifying_questions.length);
  });

  it('falls back to the rules engine when the backend fails (engine flag says so)', async () => {
    const failing = { name: 'broken', perceive: async () => { throw new Error('boom'); } };
    const out = await interpretWithModel('can you look at this?', failing);
    expect(out.engine).toBe('rules');
    // Sanity: matches what the rules engine itself produces.
    const rules = interpret('can you look at this?', 'advice');
    expect(out.canonical_translation).toBe(rules.canonical_translation);
  });

  it('fallbackToRules:false propagates the backend error', async () => {
    const failing = { name: 'broken', perceive: async () => { throw new Error('boom'); } };
    await expect(interpretWithModel('x', failing, { fallbackToRules: false })).rejects.toThrow('boom');
  });

  it('low-AR receiver profile forces playback on thin margins', async () => {
    const cautious = scoreIntake({ AR: 'c' }); // low ambiguity-resolution appetite
    const out = await interpretWithModel('did she approve it?', new MockBackend(AMBIGUOUS), { profile: cautious });
    expect(out.playback_required).toBe(true);
  });

  it('does not ask about entities the model resolved confidently', async () => {
    const resolved: PerceptionResult = {
      ...AMBIGUOUS,
      entities: [{ original: 'she', category: 'pronoun', candidates: [{ text: 'Dana (named earlier)', confidence: 0.93 }] }],
      readings: CLEAR.readings,
      canonicalTranslation: 'Did Dana approve it?',
    };
    const out = await interpretWithModel('did she approve it?', new MockBackend(resolved), { context: ['Dana sent the draft yesterday.'] });
    expect(out.clarifying_questions.find((q) => q.includes('"she"'))).toBeUndefined();
    expect(out.canonical_translation).toBe('Did Dana approve it?');
  });
});

// ── AnthropicBackend plumbing (no live calls) ────────────────────────

describe('AnthropicBackend (BYO key, structured output)', () => {
  it('refuses to construct without an apiKey', () => {
    // @ts-expect-error deliberate misuse
    expect(() => new AnthropicBackend({})).toThrow(/apiKey/);
  });

  it('parses a forced tool_use response into a sanitized PerceptionResult', async () => {
    const fetchImpl = (async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      expect(body.temperature).toBe(0);
      expect(body.tool_choice).toEqual({ type: 'tool', name: 'report_perception' });
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'report_perception', input: AMBIGUOUS }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const backend = new AnthropicBackend({ apiKey: 'sk-test', fetchImpl });
    const result = await backend.perceive('did she approve it?');
    expect(result.readings.length).toBe(2);
    expect(backend.name).toMatch(/^anthropic:/);
  });

  it('surfaces HTTP failures without echoing the response body', async () => {
    const fetchImpl = (async () => new Response('{"error":"secret-echo"}', { status: 401 })) as unknown as typeof fetch;
    const backend = new AnthropicBackend({ apiKey: 'sk-test', fetchImpl });
    await expect(backend.perceive('x')).rejects.toThrow(/HTTP 401/);
    await expect(backend.perceive('x')).rejects.not.toThrow(/secret-echo/);
  });

  it('throws when the response has no tool_use block', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'hi' }] }), { status: 200 })) as unknown as typeof fetch;
    const backend = new AnthropicBackend({ apiKey: 'sk-test', fetchImpl });
    await expect(backend.perceive('x')).rejects.toThrow(/tool_use/);
  });
});

// ── T1' structural filter (closed-class anaphora only get interrogated) ──

describe("T1' decision filter: content nouns are never interrogated", () => {
  const mk = (original: string, bracketed = true): PerceptionResult => ({
    entities: [{ original, category: 'unspecified', candidates: [{ text: bracketed ? '[unknown]' : 'resolved', confidence: 0.5 }] }],
    intents: [{ type: 'question', confidence: 0.9 }],
    readings: [
      { label: 'main', paraphrase: 'p', interpConf: 0.9, userEvid: 0.85, epistemic: 0.8, narrative: 0.7, semGap: 0.1, transInteg: 0.98 },
      { label: 'alt', paraphrase: 'q', interpConf: 0.2, userEvid: 0.2, epistemic: 0.4, narrative: 0.4, semGap: 0.6, transInteg: 0.6 },
    ],
    canonicalTranslation: 'x',
  });

  it.each(['the venue', 'gallon', '300', 'flyers', 'the attached sheet', 'done'])(
    'plain content form "%s" produces no question even when bracketed and low-confidence',
    async (form) => {
      const out = await interpretWithModel('x', new MockBackend(mk(form)));
      expect(out.clarifying_questions).toEqual([]);
    },
  );

  it.each(['she', 'it', 'them', 'this', 'those', 'there', 'somebody', 'sometime', 'that vendor', 'the thing we discussed', 'the usual crowd'])(
    'anaphoric form "%s" still produces the referent question',
    async (form) => {
      const out = await interpretWithModel('x', new MockBackend(mk(form)));
      expect(out.clarifying_questions.join(' ')).toContain(form);
    },
  );

  it('expressive register suppresses entity questions (opinion/emotional_support)', async () => {
    const r = mk('this');
    r.intents = [{ type: 'opinion', confidence: 0.9 }];
    const out = await interpretWithModel('x', new MockBackend(r));
    expect(out.clarifying_questions).toEqual([]);
  });

  it('anaphoric form resolved with high confidence is not interrogated', async () => {
    const r = mk('she', false);
    r.entities[0].candidates[0].confidence = 0.93;
    const out = await interpretWithModel('x', new MockBackend(r));
    expect(out.clarifying_questions).toEqual([]);
  });
});
