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
  MODEL_DIALS,
  MODEL_RHAT_STORAGE_KEY,
  NEUTRAL_PROFILE,
  PAYLOAD_HEADINGS,
  RHAT_STORAGE_KEY,
  bandOf,
  buildEquation,
  buildModelEquation,
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

// ─── The two boards ───────────────────────────────────────────────────────────

describe('the two boards', () => {
  it('each has exactly five channels, one per receiver primitive, in canonical order', () => {
    expect(DIAL_ORDER).toEqual(['TI', 'SG', 'FT', 'UE', 'AR']);
    expect(Object.keys(NEUTRAL_PROFILE)).toEqual(DIAL_ORDER);
    for (const board of [DIALS, MODEL_DIALS]) {
      expect(board).toHaveLength(5);
      expect(board.map((d) => d.key)).toEqual(DIAL_ORDER);
    }
  });

  it('every channel carries a name, a scientific name, a gloss, and two distinct end labels', () => {
    for (const board of [DIALS, MODEL_DIALS]) {
      for (const d of board) {
        for (const s of [d.name, d.scientific, d.gloss, d.low, d.high]) expect(s.trim().length, d.key).toBeGreaterThan(0);
        expect(d.low).not.toBe(d.high);
      }
      expect(new Set(board.map((d) => d.name)).size).toBe(5);
    }
  });

  it('your board uses core’s profile-card names; the model’s board uses different names (they are different readers)', () => {
    expect(DIALS.map((d) => d.name)).toEqual(['Pace', 'Tone', 'Directness', 'Flexibility', 'Ambiguity']);
    expect(MODEL_DIALS.map((d) => d.name)).toEqual(['Memory', 'Gain', 'Trigger', 'Agility', 'Commit']);
    const overlap = DIALS.map((d) => d.name).filter((n) => MODEL_DIALS.some((m) => m.name === n));
    expect(overlap).toEqual([]);
  });

  it("each of your channels drives a real directive field in core's deriveRenderingDirectives", () => {
    const d = deriveRenderingDirectives(NEUTRAL_PROFILE);
    expect(new Set(DIALS.map((s) => s.directive)).size).toBe(5);
    for (const spec of DIALS) {
      expect(spec.directive in d, spec.key).toBe(true);
      expect(spec.directive in d.why, spec.key).toBe(true);
    }
  });

  it('the two boards store under different keys, yours being the /calibrate key', () => {
    expect(RHAT_STORAGE_KEY).toBe('rpcs1.rhat.v1');
    expect(MODEL_RHAT_STORAGE_KEY).toBe('rpcs1.rhat.model.v1');
    expect(MODEL_RHAT_STORAGE_KEY).not.toBe(RHAT_STORAGE_KEY);
    expect(read('app/calibrate/page.tsx')).toContain(`'${RHAT_STORAGE_KEY}'`);
    expect(read('components/ReturnPanel.tsx')).toContain(`'${RHAT_STORAGE_KEY}'`);
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
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(['TI', 'SG', 'FT', 'UE', 'AR'].every((k) => typeof parsed[k] === 'number')).toBe(true);
    }
  });

  it('profilesEqual compares all five channels', () => {
    expect(profilesEqual(NEUTRAL_PROFILE, { ...NEUTRAL_PROFILE })).toBe(true);
    expect(profilesEqual(NEUTRAL_PROFILE, profile({ AR: 51 }))).toBe(false);
  });
});

// ─── Your board: the equation is the equation that runs ───────────────────────

describe('buildEquation (your board) — every displayed string is core’s own output', () => {
  it('the instruction paragraph equals rewriteForProfile(...).rewrite_instructions, on the whole grid', () => {
    for (const p of GRID) {
      const eq = buildEquation(p);
      expect(eq.instruction).toBe(rewriteForProfile('any text', p).rewrite_instructions);
      expect(eq.instruction.trim().length).toBeGreaterThan(0);
    }
  });

  it('each term’s why-line and mode are core’s, keyed by the channel’s directive', () => {
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

  it('the vector names the board and lists all five channels in order', () => {
    expect(buildEquation({ TI: 1, SG: 2, FT: 3, UE: 4, AR: 5 }).vector).toBe('R̂(you) = (TI 1, SG 2, FT 3, UE 4, AR 5)');
  });

  it('is deterministic and clamps its input', () => {
    const a = buildEquation({ TI: 150, SG: -1, FT: 50.4, UE: 50, AR: 50 });
    const b = buildEquation({ TI: 100, SG: 0, FT: 50, UE: 50, AR: 50 });
    expect(a).toEqual(b);
  });
});

// ─── The model’s board: the agent equation ────────────────────────────────────

describe('buildModelEquation (the model’s board) — every displayed string is core’s own output', () => {
  it('params and regime are the verbatim core calls; the vector names the board', () => {
    for (const p of GRID) {
      const eq = buildModelEquation(p);
      expect(eq.params).toEqual(mapToParameters(p, AGENT_PLATFORM));
      expect(eq.regime).toBe(evaluateRegime(p));
    }
    expect(buildModelEquation({ TI: 1, SG: 2, FT: 3, UE: 4, AR: 5 }).vector).toBe('R̂(model) = (TI 1, SG 2, FT 3, UE 4, AR 5)');
  });

  it('each channel’s why-line names the setting it drives, with core’s value', () => {
    for (const p of GRID) {
      const params = mapToParameters(p, AGENT_PLATFORM);
      const eq = buildModelEquation(p);
      const why = Object.fromEntries(eq.terms.map((t) => [t.key, t.why])) as Record<string, string>;
      expect(why.TI).toContain(`max_tokens ${params.max_tokens}`);
      expect(why.TI).toContain(`context ${params.context_strategy}`);
      expect(why.SG).toContain(`temperature ${params.temperature}`);
      expect(why.SG).toContain(`top_p ${params.top_p}`);
      expect(why.UE).toContain(`retry ${params.retry_strategy}`);
      expect(why.AR).toContain(`tool use ${params.tool_use_strategy}`);
      if (p.FT >= 65) {
        expect(params.tool_use_strategy).toBe('explicit_confirmation');
        expect(why.FT).toContain('explicit confirmation');
      } else {
        expect(why.FT).toContain('follows AR');
      }
      for (const t of eq.terms) expect(t.value).toBe(p[t.key]);
    }
  });

  it('the stance is core’s system_prompt_additions joined, never empty; the settings line carries every parameter', () => {
    for (const p of GRID) {
      const params = mapToParameters(p, AGENT_PLATFORM);
      const eq = buildModelEquation(p);
      expect(eq.stance).toBe((params.system_prompt_additions ?? []).join(' '));
      expect(eq.stance.length).toBeGreaterThan(0);
      for (const piece of [
        `temperature ${params.temperature}`,
        `top_p ${params.top_p}`,
        `max_tokens ${params.max_tokens}`,
        `context ${params.context_strategy}`,
        `tool use ${params.tool_use_strategy}`,
        `retry ${params.retry_strategy}`,
      ]) {
        expect(eq.settingsLine).toContain(piece);
      }
    }
  });

  it('the stance follows the model board: low Commit adds the ambiguity caution; high Trigger adds the high-stakes check', () => {
    expect(buildModelEquation(profile({ AR: 20 })).stance).toContain('explicitly acknowledge the uncertainty');
    expect(buildModelEquation(profile({ AR: 80 })).stance).not.toContain('explicitly acknowledge the uncertainty');
    expect(buildModelEquation(profile({ FT: 70 })).stance).toContain('verify your understanding by restating the request');
    expect(buildModelEquation(profile({ FT: 30 })).stance).not.toContain('verify your understanding');
  });

  it('agent-side lines stay ASCII-safe (fallback fonts render ⟨⟩, subscripts and ∧ as boxes)', () => {
    for (const line of buildModelEquation(NEUTRAL_PROFILE).lines) {
      expect(line, line).toMatch(/^[\x20-\x7E]+$/);
    }
  });
});

describe('agent-side lines — the stated formulas reproduce core over the full range', () => {
  it('temperature and top_p: stated SG formulas equal mapToParameters on the generic platform, SG = 0..100', () => {
    for (let SG = 0; SG <= 100; SG += 1) {
      const params = mapToParameters(profile({ SG }), AGENT_PLATFORM);
      expect(params.temperature, `SG=${SG}`).toBe(Math.round((1.0 - (SG / 100) * (1.0 - 0.0)) * 100) / 100);
      expect(params.top_p, `SG=${SG}`).toBe(Math.round(((1 - SG / 100) * 0.6 + 0.4) * 100) / 100);
      const lines = buildModelEquation(profile({ SG })).lines.join('\n');
      expect(lines).toContain(`= ${params.temperature}`);
      expect(lines).toContain(`= ${params.top_p}`);
    }
  });

  it('max_tokens: stated TI formula equals mapToParameters on the generic platform, TI = 0..100', () => {
    for (let TI = 0; TI <= 100; TI += 1) {
      const params = mapToParameters(profile({ TI }), AGENT_PLATFORM);
      expect(params.max_tokens, `TI=${TI}`).toBe(Math.round((256 + (TI / 100) * (4096 - 256)) / 256) * 256);
      expect(buildModelEquation(profile({ TI })).lines.join('\n')).toContain(`= ${params.max_tokens}`);
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

  it('the stated stance rules match core at every boundary (FT 60/75, TI 25, AR 35)', () => {
    const has = (p: ReceiverProfile, needle: string) =>
      (mapToParameters(p, AGENT_PLATFORM).system_prompt_additions ?? []).some((s) => s.includes(needle));
    expect(has(profile({ FT: 60 }), 'verify your understanding')).toBe(true);
    expect(has(profile({ FT: 59 }), 'verify your understanding')).toBe(false);
    expect(has(profile({ FT: 75 }), 'Treat uncertain signals as noise')).toBe(true);
    expect(has(profile({ FT: 74 }), 'Treat uncertain signals as noise')).toBe(false);
    expect(has(profile({ TI: 25 }), 'Be concise')).toBe(true);
    expect(has(profile({ TI: 26 }), 'Be concise')).toBe(false);
    expect(has(profile({ AR: 35 }), 'acknowledge the uncertainty')).toBe(true);
    expect(has(profile({ AR: 36 }), 'acknowledge the uncertainty')).toBe(false);
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
      const eq = buildModelEquation(p);
      expect(eq.regime).toBe(regime);
      expect(eq.lines.join('\n')).toContain(`regime = ${regime}`);
    }
  });
});

// ─── The payload is what the right pane shows ─────────────────────────────────

describe('buildPayload — exactly what the hand-off sends', () => {
  it('carries your instruction, the model’s stance and settings, then the trimmed message, under the four headings, in order', () => {
    const you = profile({ TI: 80, FT: 80, AR: 20 });
    const model = profile({ SG: 90, FT: 70, AR: 30 });
    const payload = buildPayload('  Fix it and send them the file.  ', you, model);
    const yours = buildEquation(you);
    const theirs = buildModelEquation(model);
    const iInstr = payload.indexOf(`${PAYLOAD_HEADINGS.instruction}: ${yours.instruction}`);
    const iStance = payload.indexOf(`${PAYLOAD_HEADINGS.stance}: ${theirs.stance}`);
    const iSettings = payload.indexOf(`${PAYLOAD_HEADINGS.settings}: ${theirs.settingsLine}`);
    const iMsg = payload.indexOf(`${PAYLOAD_HEADINGS.message}:\nFix it and send them the file.`);
    expect(iInstr).toBe(0);
    expect(iStance).toBeGreaterThan(iInstr);
    expect(iSettings).toBeGreaterThan(iStance);
    expect(iMsg).toBeGreaterThan(iSettings);
    expect(payload.endsWith('Fix it and send them the file.')).toBe(true);
  });

  it('with the boards switched off, the message travels alone', () => {
    expect(buildPayload('  hello  ', NEUTRAL_PROFILE, NEUTRAL_PROFILE, { includeInstruction: false })).toBe('hello');
  });

  it('moving a fader on either board changes the payload', () => {
    const base = buildPayload('hello', NEUTRAL_PROFILE, NEUTRAL_PROFILE);
    expect(buildPayload('hello', profile({ AR: 20 }), NEUTRAL_PROFILE)).toContain('surface the possible readings and ask');
    expect(buildPayload('hello', profile({ AR: 80 }), NEUTRAL_PROFILE)).toContain('choose the most likely reading and answer it directly');
    const hot = buildPayload('hello', NEUTRAL_PROFILE, profile({ SG: 0 }));
    expect(hot).not.toBe(base);
    expect(hot).toContain('temperature 1');
    expect(buildPayload('hello', NEUTRAL_PROFILE, profile({ SG: 100 }))).toContain('temperature 0;');
  });

  it('the settings heading tells the receiving app it may ignore what it cannot apply', () => {
    expect(PAYLOAD_HEADINGS.settings).toMatch(/otherwise ignore/);
  });
});

// ─── The hearing ──────────────────────────────────────────────────────────────

describe('hear — how the message parses, given your board', () => {
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

  it('your Ambiguity channel bends check-first vs answer-now, exactly as core does', () => {
    const clean = 'Summarize the attached quarterly report in three bullet points.';
    expect(hear(clean, profile({ AR: 20 }))!.playback).toBe(true); // "Ask me" → check the reading first
    expect(hear(clean, profile({ AR: 80 }))!.playback).toBe(false); // "Pick one and answer"
  });

  it('a high Directness channel adds the literal-check question when there is ambiguity evidence', () => {
    const h = hear('Can you sort out that thing from before?', profile({ FT: 80 }))!;
    expect(h.wouldAsk.length).toBeGreaterThan(0);
  });
});

// ─── The face: source-level ratchets ──────────────────────────────────────────

describe('the homepage is the instrument (source ratchets)', () => {
  const page = read('app/page.tsx');
  const instrument = read('components/Instrument.tsx');
  const board = read('components/FaderBoard.tsx');
  const fader = read('components/Fader.tsx');
  const css = read('app/globals.css');

  it('mounts the instrument and keeps the #box anchor the footer links to', () => {
    expect(page).toContain('<Instrument />');
    expect(instrument).toContain('id="box"');
  });

  it('renders two boards — yours and the model’s — each from its single DIALS source', () => {
    expect(instrument).toContain('side="you"');
    expect(instrument).toContain('side="model"');
    expect(instrument).toContain('dials={DIALS}');
    expect(instrument).toContain('dials={MODEL_DIALS}');
    expect(board).toContain('<Fader');
    expect(board).toContain('dials.map(');
  });

  it('faders are native vertical range inputs (keyboard, touch, and screen readers for free)', () => {
    expect(fader).toContain('type="range"');
    expect(fader).toContain('aria-orientation="vertical"');
    expect(fader).toContain('aria-valuetext=');
    expect(css).toMatch(/\.fader\s*\{[^}]*rotate\(-90deg\)/);
    expect(css).toContain('--fader-v');
  });

  it('links the Obsidian second brain (/connect), the reply leg (/bridge), and Labs — and names Obsidian', () => {
    expect(page).toContain('href="/connect"');
    expect(page).toContain('href="/bridge"');
    expect(page).toContain('href="/labs"');
    expect(page).toMatch(/Obsidian/);
  });

  it('carries no offer or pitch copy: no prices, no "free", no tiers, no pilot or diagnostic funnel', () => {
    for (const [name, src] of [['page', page], ['instrument', instrument], ['board', board], ['fader', fader]] as const) {
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

  it('the site footer carries no pitch link: no Founding pilot, no /diagnostic call-to-action (2026-09-04 decision)', () => {
    const footer = read('components/Footer.tsx');
    expect(footer).not.toMatch(/founding/i);
    expect(footer).not.toContain('href="/diagnostic"');
    // Organizations stay reachable — the ratchet removes the pitch, not the path.
    expect(footer).toContain('href="/pricing"');
    expect(footer).toContain('href="/institutions"');
  });
});
