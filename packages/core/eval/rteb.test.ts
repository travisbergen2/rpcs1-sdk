/**
 * RTEB v1 — Translation-Entropy Routing Benchmark runner.
 *
 * Registered 2026-07-29 (RTEB v1 Protocol), thresholds frozen BEFORE this
 * runner ever executed. Grade: DEVELOPER BENCHMARK / corroboration — the item
 * bank was authored with knowledge of the lexical cue lists (stratum A is
 * cue-bearing by construction). This bench can validate/falsify the router's
 * MECHANICS; it supports no user-outcome claim.
 *
 * Frozen gates (verdict EARNS-MECHANICS iff M1, M2, M4, M6 all pass):
 *   M1  askRate(C) − askRate(A) ≥ 0.30            (ambiguity discrimination)
 *   M2  err(asked) ≥ 1.5 × err(committed), A+B    (asks where guessing fails)
 *   M3  |acc(E) − acc(TS)| ≤ 2pp expected          (reported, not a gate)
 *   M4  SCR drops stratum-A committed acc ≥ 20pp   (semantics dependence)
 *   M5  stratum-B floor: descriptive only
 *   M6  acc(E) − acc(RND) ≥ 5pp, A+B               (random-abstention sanity)
 *
 * Gate outcomes are REPORTED (and written to eval/rteb-results.json), not
 * asserted — a failed gate is a legitimate registered result, not a CI break.
 * Only construction QA (stratum-B zero-cue property, bank shape) is asserted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_INTENT_HYPOTHESES,
  computePosterior,
  routeIntent,
  scoreLexicalLikelihoods,
  type IntentHypothesis,
  type RoutingDecision,
} from '../src/routing';

const here = dirname(fileURLToPath(import.meta.url));
interface Item { id: string; stratum: 'A' | 'B' | 'C'; truth: string[]; text: string }
const bank: { items: Item[] } = JSON.parse(readFileSync(join(here, 'rteb-battery.json'), 'utf8'));
const items = bank.items;

const isAsk = (d: RoutingDecision) => d.mode === 'clarify' || d.mode === 'present_options';
const correct = (topId: string, it: Item) => it.truth.includes(topId);
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

/** Deterministic PRNG (mulberry32) for the RND baseline. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derangement of the six real intents' cue lists (other stays empty). */
function scrambledHypotheses(): IntentHypothesis[] {
  const real = DEFAULT_INTENT_HYPOTHESES.filter((h) => h.id !== 'other');
  const cues = real.map((h) => h.cues ?? []);
  return [
    ...real.map((h, i) => ({ ...h, cues: cues[(i + 1) % real.length] })),
    DEFAULT_INTENT_HYPOTHESES.find((h) => h.id === 'other')!,
  ];
}

describe('RTEB v1 — construction QA (asserted)', () => {
  it('bank shape: 48 A + 24 B + 18 C = 90', () => {
    const n = (s: string) => items.filter((i) => i.stratum === s).length;
    expect(n('A')).toBe(48);
    expect(n('B')).toBe(24);
    expect(n('C')).toBe(18);
  });
  it('stratum B is OOV by construction: zero cue hits across all hypotheses', () => {
    for (const it of items.filter((i) => i.stratum === 'B')) {
      const l = scoreLexicalLikelihoods(it.text, DEFAULT_INTENT_HYPOTHESES);
      const total = Object.values(l).reduce((s, v) => s + v, 0);
      expect(total, `${it.id}: "${it.text}" hits ${JSON.stringify(l)}`).toBe(0);
    }
  });
  it('stratum C truths are sets of >= 2 real intents; A/B are singletons', () => {
    for (const it of items) {
      if (it.stratum === 'C') expect(it.truth.length).toBeGreaterThanOrEqual(2);
      else expect(it.truth.length).toBe(1);
      for (const t of it.truth) expect(DEFAULT_INTENT_HYPOTHESES.some((h) => h.id === t && h.id !== 'other')).toBe(true);
    }
  });
});

describe('RTEB v1 — registered scoring run (reported, not asserted)', () => {
  it('computes all registered metrics and writes eval/rteb-results.json', () => {
    // ── Policy E: the entropy router, defaults, neutral profile ──
    const E = items.map((it) => {
      const d = routeIntent(it.text, DEFAULT_INTENT_HYPOTHESES);
      return { it, ask: isAsk(d), top: d.top.id, pTop: d.posterior.entries[0].p, margin: d.posterior.margin, mode: d.mode };
    });
    const askRate = (s: 'A' | 'B' | 'C') => {
      const xs = E.filter((e) => e.it.stratum === s);
      return xs.filter((e) => e.ask).length / xs.length;
    };
    const askCount = E.filter((e) => e.ask).length;

    // ── M1: ambiguity discrimination ──
    const m1 = askRate('C') - askRate('A');

    // ── M2: ask-precision on A+B (forced-guess error asked vs committed) ──
    const AB = E.filter((e) => e.it.stratum !== 'C');
    const asked = AB.filter((e) => e.ask);
    const committed = AB.filter((e) => !e.ask);
    const errAsked = asked.length ? asked.filter((e) => !correct(e.top, e.it)).length / asked.length : NaN;
    const errCommitted = committed.length ? committed.filter((e) => !correct(e.top, e.it)).length / committed.length : NaN;
    const m2Ratio = errAsked / errCommitted;
    const accE = committed.length ? 1 - errCommitted : NaN;

    // ── Duty-matched baselines (matched to E's ask COUNT on the full bank) ──
    // TS (Chow): abstain on the askCount items with the LOWEST top-posterior.
    const scored = items.map((it) => {
      const p = computePosterior(DEFAULT_INTENT_HYPOTHESES, scoreLexicalLikelihoods(it.text, DEFAULT_INTENT_HYPOTHESES));
      return { it, top: p.entries[0].id, pTop: p.entries[0].p, margin: p.margin };
    });
    const commitAcc = (abstainIds: Set<string>) => {
      const c = scored.filter((s) => s.it.stratum !== 'C' && !abstainIds.has(s.it.id));
      return c.length ? c.filter((s) => correct(s.top, s.it)).length / c.length : NaN;
    };
    const byAsc = (key: 'pTop' | 'margin') =>
      new Set([...scored].sort((a, b) => a[key] - b[key] || a.it.id.localeCompare(b.it.id)).slice(0, askCount).map((s) => s.it.id));
    const accTS = commitAcc(byAsc('pTop'));
    const accMG = commitAcc(byAsc('margin'));

    // RND: 200 random abstention draws at the same ask count, seed 42.
    const rng = mulberry32(42);
    let rndSum = 0;
    for (let r = 0; r < 200; r++) {
      const shuffled = [...scored].map((s) => ({ s, u: rng() })).sort((a, b) => a.u - b.u).map((x) => x.s);
      rndSum += commitAcc(new Set(shuffled.slice(0, askCount).map((s) => s.it.id)));
    }
    const accRND = rndSum / 200;

    // ── M4: scrambled semantics on stratum A ──
    const scram = scrambledHypotheses();
    const scrA = items.filter((i) => i.stratum === 'A').map((it) => {
      const d = routeIntent(it.text, scram);
      return { it, ask: isAsk(d), top: d.top.id };
    });
    const eA = E.filter((e) => e.it.stratum === 'A' && !e.ask);
    const accE_A = eA.filter((e) => correct(e.top, e.it)).length / eA.length;
    const scrCommitted = scrA.filter((e) => !e.ask);
    const accSCR_A = scrCommitted.length ? scrCommitted.filter((e) => correct(e.top, e.it)).length / scrCommitted.length : 0;
    const m4Drop = accE_A - accSCR_A;

    // ── M5: stratum-B floor (descriptive) ──
    const eB = E.filter((e) => e.it.stratum === 'B');
    const eBCommitted = eB.filter((e) => !e.ask);
    const m5 = {
      askRateB: eB.filter((e) => e.ask).length / eB.length,
      committedAccB: eBCommitted.length ? eBCommitted.filter((e) => correct(e.top, e.it)).length / eBCommitted.length : null,
      committedCountB: eBCommitted.length,
    };

    // ── Gates ──
    const gates = {
      M1: { value: m1, threshold: 0.3, pass: m1 >= 0.3 },
      M2: { errAsked, errCommitted, ratio: Number.isFinite(m2Ratio) ? m2Ratio : 'inf (err(committed)=0)', threshold: 1.5, pass: m2Ratio >= 1.5 },
      M3: { accE, accTS, accMG, delta: accE - accTS, expectation: 'PASS-TRIVIAL if |delta| <= 0.02',
            outcome: Math.abs(accE - accTS) <= 0.02 ? 'PASS-TRIVIAL' : accE > accTS ? 'SURPRISE-POSITIVE (down-weighted)' : 'FAIL-VS-CONFIDENCE' },
      M4: { accE_A, accSCR_A, drop: m4Drop, threshold: 0.2, pass: m4Drop >= 0.2 },
      M5: m5,
      M6: { accE, accRND, delta: accE - accRND, threshold: 0.05, pass: accE - accRND >= 0.05 },
    };
    const verdict = gates.M1.pass && gates.M2.pass && gates.M4.pass && gates.M6.pass ? 'EARNS-MECHANICS' : 'NOT-EARNED';

    const results = {
      run: new Date().toISOString(),
      runLabel: process.env.RTEB_RUN_LABEL ?? 'unlabeled',
      bankSha: 'eval/rteb-battery.json (frozen 2026-07-29)',
      grade: 'developer-benchmark / corroboration',
      askRates: { A: askRate('A'), B: askRate('B'), C: askRate('C'), overallCount: askCount, overallRate: askCount / items.length },
      modesE: Object.fromEntries(['commit', 'commit_with_note', 'present_options', 'clarify'].map((m) => [m, E.filter((e) => e.mode === m).length])),
      gates,
      verdict,
    };
    writeFileSync(join(here, 'rteb-results.json'), JSON.stringify(results, null, 2));

    // ── Report ──
    /* eslint-disable no-console */
    console.log('\n══ RTEB v1 — registered run ══');
    console.log(`ask rates: A ${pct(askRate('A'))} · B ${pct(askRate('B'))} · C ${pct(askRate('C'))} · overall ${pct(askCount / items.length)} (${askCount}/90)`);
    console.log(`M1 ambiguity discrimination: ${m1.toFixed(3)} (gate ≥ 0.30) → ${gates.M1.pass ? 'PASS' : 'FAIL'}`);
    console.log(`M2 ask-precision: err(asked) ${pct(errAsked)} vs err(committed) ${pct(errCommitted)} → ratio ${m2Ratio.toFixed(2)} (gate ≥ 1.5) → ${gates.M2.pass ? 'PASS' : 'FAIL'}`);
    console.log(`M3 vs Chow: acc(E) ${pct(accE)} vs acc(TS) ${pct(accTS)} vs acc(MG) ${pct(accMG)} → ${gates.M3.outcome}`);
    console.log(`M4 scramble: acc_A(E) ${pct(accE_A)} vs acc_A(SCR) ${pct(accSCR_A)} → drop ${pct(m4Drop)} (gate ≥ 20pp) → ${gates.M4.pass ? 'PASS' : 'FAIL'}`);
    console.log(`M5 OOV floor: askRate(B) ${pct(m5.askRateB)}, committed acc(B) ${m5.committedAccB === null ? 'n/a (all asked)' : pct(m5.committedAccB)} on ${m5.committedCountB} items`);
    console.log(`M6 vs random: acc(E) ${pct(accE)} vs acc(RND) ${pct(accRND)} (gate ≥ +5pp) → ${gates.M6.pass ? 'PASS' : 'FAIL'}`);
    console.log(`VERDICT: ${verdict}`);
    /* eslint-enable no-console */

    // Non-degeneracy only (the registered gates are reported, not asserted):
    expect(committed.length).toBeGreaterThan(0);
    expect(asked.length).toBeGreaterThan(0);
  });
});
