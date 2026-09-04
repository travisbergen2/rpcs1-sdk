import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  deriveRenderingDirectives,
  evaluateRegime,
  mapToParameters,
  rewriteForProfile,
  type ReceiverProfile,
} from '@rpcs1/core';
import {
  AGENT_PLATFORM,
  DIALS,
  DIAL_ORDER,
  NEUTRAL_PROFILE,
  PAYLOAD_HEADINGS,
  RHAT_STORAGE_KEY,
  bandOf,
  buildEquation,
  buildPayload,
  clampProfile,
  hear,
  parseStoredProfile,
  profilesEqual,
  serializeProfile,
} from '../lib/instrument';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

const profile = (over: Partial<ReceiverProfile>): ReceiverProfile => ({ ...NEUTRAL_PROFILE, ...over });

/** A deterministic spread of profiles across the space (no randomness in tests). */
const GRID: ReceiverProfile[] = [];
for (const TI of [0, 39, 40, 61, 100]) {
  for (const AR of [0, 50, 100]) {
    GRID.push({ TI, SG: (TI + 37) % 101, FT: (AR + 63) % 101, UE: (TI * 3) % 101, AR });
  }
}

// ─── Dials ────────────────────────────────────────────────────────────────────

describe('the five dials', () => {
  it('are exactly five, one per receiver primitive, in canonical order', () => {
    expect(DIALS).toHaveLength(5);
    expect(DIALS.map((d) => d.key)).toEqual(DIAL_ORDER);
    expect(DIAL_ORDER).toEqual(['TI', 'SG', 'FT', 'UE', 'AR']);
    expect(Object.keys(NEUTRAL_PROFILE)).toEqual(DIAL_ORDER);
  });

  it('carry a human-side name, a scientific name, a gloss, and two end labels — all distinct, none empty', () => {
    for (const d of DIALS) {
      for (const s of [d.name, d.scientific, d.gloss, d.low, d.high]) expect(s.trim().length, d.key).toBeGreaterThan(0);
      expect(d.low).not.toBe(d.high);
    }
    expect(new Set(DIALS.map((d) => d.name)).size).toBe(5);
    expect(new Set(DIALS.map((d) => d.directive)).size).toBe(5);
  });

  it("each dial drives a real directive field in core's deriveRenderingDirectives", () => {
    const d = deriveRenderingDirectives(NEUTRAL_PROFILE);
    for (const spec of DIALS) {
      expect(spec.directive in d, spec.key).toBe(true);
      expect(spec.directive in d.why, spec.key).toBe(true);
    }
  });

  it('use the same human-side names as core’s profile card (Pace/Tone/Directness/Flexibility/Ambiguity)', () => {
    expect(DIALS.map((d) => d.name)).toEqual(['Pace', 'Tone', 'Directness', 'Flexibility', 'Ambiguity']);
  });
});

// ─── Profile hygiene ──────────────────────────────────────────────────────────

describe('clampProfile / storage round trip', () => {
  it('garbage → neutral; strings ignored; numbers rounded and clamped', () => {
    expect(clampProfile(null)).toEqual(NEUTRAL_PROFILE);
    expect(clampProfile('nope')).toEqual(NEUTRAL_PROFILE);
    expect(clampProfile({ TI: 'high', SG: NaN, FT: Infinity })).toEqual(NEUTRAL_PROFILE);
    expect(clampProfile({ TI: 150, SG: -5, FT: 49.6, UE: 0.4, AR: 100 })).toEqual({ TI: 100, SG: 0, FT: 50, UE: 0, AR: 100 });
  });

  it('parseStoredProfile applies the same acceptance rule as the Bridge return leg: all five numeric keys, or null', () => {
    expect(parseStoredProfile(null)).toBeNull();
    expect(parseStoredProfile('')).toBeNull();
    expect(parseStoredProfile('{not json')).toBeNull();
    expect(parseStoredProfile('42')).toBeNull();
    expect(parseStoredProfile(JSON.stringify({ TI: 10, SG: 20, FT: 30, UE: 40 }))).toBeNull(); // AR missing
    expect(parseStoredProfile(JSON.stringify({ TI: 10, SG: 20, FT: 30, UE: 40, AR: '50' }))).toBeNull();
    expect(parseStoredProfile(JSON.stringify({ TI: 10, SG: 20, FT: 30, UE: 40, AR: 50 }))).toEqual({ TI: 10, SG: 20, FT: 30, UE: 40, AR: 50 });
  });

  it('serialize → parse round-trips, and the stored string passes ReturnPanel’s own check verbatim', () => {
    for (const p of GRID) {
      const raw = serializeProfile(p);
      expect(parseStoredProfile(raw)).toEqual(p);
      // ReturnPanel.loadRhat's rule, re-stated: every key is a number.
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(['TI', 'SG', 'FT', 'UE', 'AR'].every((k) => typeof parsed[k] === 'number')).toBe(true);
    }
  });

  it('uses the storage key /calibrate writes and ReturnPanel reads', () => {
    expect(RHAT_STORAGE_KEY).toBe('rpcs1.rhat.v1');
    expect(read('app/calibrate/page.tsx')).toContain(`'${RHAT_STORAGE_KEY}'`);
    expect(read('components/ReturnPanel.tsx')).toContain(`'${RHAT_STORAGE_KEY}'`);
  });

  it('profilesEqual compares all five dials', () => {
    expect(profilesEqual(NEUTRAL_PROFILE, { ...NEUTRAL_PROFILE })).toBe(true);
    expect(profilesEqual(NEUTRAL_PROFILE, profile({ AR: 51 }))).toBe(false);
  });
});

// ─── The equation is the equation that runs ───────────────────────────────────

describe('buildEquation — every displayed string is core’s own output', () => {
  it('the instruction paragraph equals rewriteForProfile(...).rewrite_instructions, on the whole grid', () => {
    for (const p of GRID) {
      const eq = buildEquation(p);
      expect(eq.instruction).toBe(rewriteForProfile('any text', p).rewrite_instructions);
      expect(eq.instruction.trim().length).toBeGreaterThan(0);
    }
  });

  it('each term’s why-line and mode are core’s, keyed by the dial’s directive', () => {
    for (const p of GRID) {
      const d = deriveRenderingDirectives(p);
      const eq = buildEquation(p);
      for (const spec of DIALS) {
        const term = eq.terms.find((t) => t.key === spec.key)!;
        expect(term.why).toBe(d.why[spec.directive]);
        expect(term.mode).toBe(String(d[spec.directive]));
        expect(term.value).toBe(p[spec.key]);
      }
    }
  });

  it('the displayed band rule (<40 low, >60 high, else mid) matches the mode core selects at every boundary', () => {
    const MODES: Record<string, [string, string, string]> = {
      structure: ['bluf', 'balanced', 'context_first'],
      warmth: ['minimal', 'moderate', 'warm'],
      explicitness: ['implication_ok', 'moderate', 'explicit_literal'],
      revision: ['consistent', 'balanced', 'open_challenge'],
      ambiguity: ['clarify', 'commit_with_note', 'commit'],
    };
    const idx = { low: 0, mid: 1, high: 2 } as const;
    for (const v of [0, 1, 39, 40, 41, 59, 60, 61, 99, 100]) {
      expect(bandOf(v)).toBe(v < 40 ? 'low' : v > 60 ? 'high' : 'mid');
      for (const spec of DIALS) {
        const term = buildEquation(profile({ [spec.key]: v })).terms.find((t) => t.key === spec.key)!;
        expect(term.mode, `${spec.key}=${v}`).toBe(MODES[spec.directive][idx[term.band]]);
      }
    }
  });

  it('the vector notation lists all five dials in order with their values', () => {
    expect(buildEquation({ TI: 1, SG: 2, FT: 3, UE: 4, AR: 5 }).vector).toBe('R̂ = ⟨TI 1, SG 2, FT 3, UE 4, AR 5⟩');
  });

  it('is deterministic and clamps its input', () => {
    const a = buildEquation({ TI: 150, SG: -1, FT: 50.4, UE: 50, AR: 50 });
    const b = buildEquation({ TI: 100, SG: 0, FT: 50, UE: 50, AR: 50 });
    expect(a).toEqual(b);
  });
});

describe('agent-side lines — the stated formulas reproduce core over the full range', () => {
  it('temperature and top_p: stated SG formulas equal mapToParameters on the generic platform, SG = 0..100', () => {
    for (let SG = 0; SG <= 100; SG += 1) {
      const params = mapToParameters(profile({ SG }), AGENT_PLATFORM);
      expect(params.temperature, `SG=${SG}`).toBe(Math.round((1.0 - (SG / 100) * (1.0 - 0.0)) * 100) / 100);
      expect(params.top_p, `SG=${SG}`).toBe(Math.round(((1 - SG / 100) * 0.6 + 0.4) * 100) / 100);
      const lines = buildEquation(profile({ SG })).agent.lines.join('\n');
      expect(lines).toContain(`= ${params.temperature}`);
      expect(lines).toContain(`= ${params.top_p}`);
    }
  });

  it('max_tokens: stated TI formula equals mapToParameters on the generic platform, TI = 0..100', () => {
    for (let TI = 0; TI <= 100; TI += 1) {
      const params = mapToParameters(profile({ TI }), AGENT_PLATFORM);
      expect(params.max_tokens, `TI=${TI}`).toBe(Math.round((256 + (TI / 100) * (4096 - 256)) / 256) * 256);
      expect(buildEquation(profile({ TI })).agent.lines.join('\n')).toContain(`= ${params.max_tokens}`);
    }
  });

  it('the stated threshold rules for context / tool use / retry match core at every boundary', () => {
    for (const TI of [0, 34, 35, 64, 65, 100]) {
      const p = mapToParameters(profile({ TI }), AGENT_PLATFORM);
      expect(p.context_strategy).toBe(TI >= 65 ? 'long_window' : TI >= 35 ? 'rolling_summary' : 'frequent_grounding');
    }
    for (const UE of [0, 34, 35, 64, 65, 100]) {
      const p = mapToParameters(profile({ UE }), AGENT_PLATFORM);
      expect(p.retry_strategy).toBe(UE >= 65 ? 'aggressive' : UE >= 35 ? 'moderate' : 'minimal');
    }
    for (const FT of [0, 64, 65, 100]) {
      for (const AR of [0, 35, 36, 64, 65, 100]) {
        const p = mapToParameters(profile({ FT, AR }), AGENT_PLATFORM);
        const expected = FT >= 65 ? 'explicit_confirmation' : AR <= 35 ? 'cautious_chaining' : AR >= 65 ? 'aggressive' : 'fail_fast';
        expect(p.tool_use_strategy, `FT=${FT} AR=${AR}`).toBe(expected);
      }
    }
  });

  it('the stated regime rule matches evaluateRegime, and the line carries the value', () => {
    const cases: Array<[ReceiverProfile, string]> = [
      [profile({ TI: 65, SG: 55 }), 'near_oscillation'],
      [profile({ TI: 35, SG: 65 }), 'near_overload'],
      [profile({ UE: 35, FT: 65 }), 'near_freeze'],
      [NEUTRAL_PROFILE, 'stable'],
      [profile({ TI: 64, SG: 100 }), 'stable'],
    ];
    for (const [p, regime] of cases) {
      expect(evaluateRegime(p)).toBe(regime);
      const eq = buildEquation(p);
      expect(eq.agent.regime).toBe(regime);
      expect(eq.agent.lines.join('\n')).toContain(`regime = ${regime}`);
    }
  });

  it('every line names its value verbatim from the same mapToParameters call', () => {
    for (const p of GRID) {
      const eq = buildEquation(p);
      const params = mapToParameters(p, AGENT_PLATFORM);
      expect(eq.agent.params).toEqual(params);
      const joined = eq.agent.lines.join('\n');
      expect(joined).toContain(`context = ${params.context_strategy}`);
      expect(joined).toContain(`tool use = ${params.tool_use_strategy}`);
      expect(joined).toContain(`retry = ${params.retry_strategy}`);
    }
  });
});

// ─── The payload is what the right pane shows ─────────────────────────────────

describe('buildPayload — exactly what the hand-off sends', () => {
  it('contains the instruction paragraph verbatim, then the trimmed message, under the two headings', () => {
    const p = profile({ TI: 80, FT: 80, AR: 20 });
    const text = '  Fix it and send them the file.  ';
    const payload = buildPayload(text, p);
    const { instruction } = buildEquation(p);
    expect(payload.startsWith(`${PAYLOAD_HEADINGS.instruction}: ${instruction}`)).toBe(true);
    expect(payload.endsWith(`${PAYLOAD_HEADINGS.message}:\nFix it and send them the file.`)).toBe(true);
  });

  it('with the dials switched off, the message travels alone', () => {
    expect(buildPayload('  hello  ', NEUTRAL_PROFILE, { includeInstruction: false })).toBe('hello');
  });

  it('moving a dial changes the payload (the sliders drive what is sent)', () => {
    const a = buildPayload('hello', profile({ AR: 20 }));
    const b = buildPayload('hello', profile({ AR: 80 }));
    expect(a).not.toBe(b);
    expect(a).toContain('surface the possible readings and ask');
    expect(b).toContain('choose the most likely reading and answer it directly');
  });
});

// ─── The hearing ──────────────────────────────────────────────────────────────

describe('hear — how the message parses, given the dials', () => {
  it('is null for empty input', () => {
    expect(hear('', NEUTRAL_PROFILE)).toBeNull();
    expect(hear('   \n', NEUTRAL_PROFILE)).toBeNull();
  });

  it('brackets unresolved referents and lists the questions the model would need answered', () => {
    const h = hear('Fix it and send them the file.', NEUTRAL_PROFILE)!;
    expect(h.readsAs).toContain('[');
    expect(h.readsAs).not.toBe('Fix it and send them the file.');
    expect(h.wouldAsk.some((q) => q.includes('"it"'))).toBe(true);
    expect(h.wouldAsk.some((q) => q.includes('"them"'))).toBe(true);
  });

  it('echoes clean text unchanged and asks nothing', () => {
    const clean = 'Summarize the attached quarterly report in three bullet points.';
    const h = hear(clean, NEUTRAL_PROFILE)!;
    expect(h.readsAs).toBe(clean);
    expect(h.wouldAsk).toEqual([]);
  });

  it('the Ambiguity dial bends check-first vs answer-now, exactly as core does', () => {
    const clean = 'Summarize the attached quarterly report in three bullet points.';
    expect(hear(clean, profile({ AR: 20 }))!.playback).toBe(true); // "Ask me" → check the reading first
    expect(hear(clean, profile({ AR: 80 }))!.playback).toBe(false); // "Pick one and answer"
  });

  it('a high Directness dial adds the literal-check question when there is ambiguity evidence', () => {
    const h = hear('Can you sort out that thing from before?', profile({ FT: 80 }))!;
    expect(h.wouldAsk.length).toBeGreaterThan(0);
  });
});

// ─── The face: source-level ratchets ──────────────────────────────────────────

describe('the homepage is the instrument (source ratchets)', () => {
  const page = read('app/page.tsx');
  const instrument = read('components/Instrument.tsx');

  it('mounts the instrument and keeps the #box anchor the footer links to', () => {
    expect(page).toContain('<Instrument />');
    expect(instrument).toContain('id="box"');
  });

  it('renders one slider per dial from the single DIALS source', () => {
    expect(instrument).toContain('DIALS.map(');
    expect(instrument).toContain('type="range"');
  });

  it('links the Obsidian second brain (/connect), the reply leg (/bridge), and Labs — and names Obsidian', () => {
    expect(page).toContain('href="/connect"');
    expect(page).toContain('href="/bridge"');
    expect(page).toContain('href="/labs"');
    expect(page).toMatch(/Obsidian/);
  });

  it('carries no offer or pitch copy: no prices, no "free", no tiers, no pilot or diagnostic funnel', () => {
    for (const [name, src] of [['page', page], ['instrument', instrument]] as const) {
      // Source files legitimately contain `${...}` template literals; a price is a dollar sign followed by a digit.
      expect(/\$\d/.test(src), `${name}: price`).toBe(false);
      expect(/\bfree\b/i.test(src), `${name}: offer language`).toBe(false);
      expect(/\btier\b|\bplan\b|\bpricing\b/i.test(src), `${name}: offer language`).toBe(false);
      expect(/founding|diagnostic|licen[sc]e|checkout/i.test(src), `${name}: funnel language`).toBe(false);
    }
  });

  it('has an info bubble and a show-the-math toggle, both keyboard-accessible buttons', () => {
    expect(instrument).toMatch(/What is this doing\?/);
    expect(instrument).toMatch(/aria-expanded=\{infoOpen\}/);
    expect(instrument).toMatch(/aria-expanded=\{showMath\}/);
  });

  it('states the hand-off contract: nothing is sent from the page', () => {
    expect(instrument).toMatch(/Nothing is sent from this page/);
  });
});
