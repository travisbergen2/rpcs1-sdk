/**
 * RPCS-1 Translator Eval — frozen battery runner.
 *
 * Runs the frozen ambiguous-prompt battery (battery.json) against:
 *   1. the legacy rules engine (always — offline, free), and
 *   2. the model-backed engine (only when RPCS1_EVAL_ANTHROPIC_API_KEY is set;
 *      BYO-key — no key, no model calls, no fabricated numbers).
 *
 * Results are written to eval/results-<engine>.json and printed as a summary.
 *
 * SHIP GATE (fixed 2026-07-23 AFTER the rules baseline was measured but BEFORE
 * any model-backed engine ran on this battery — model results cannot have
 * influenced these thresholds):
 *
 * Rules baseline (n=50): clarify 66.0% · entity recall 100% (surface forms are
 * on its keyword list by construction) · intent 38.0% · false-clarify on
 * controls 10.0% · context grounding 0.0%.
 *
 * The model engine may replace the rules engine on user-facing surfaces only
 * if, on this battery, ALL of:
 *   G1. clarify-decision accuracy  ≥ 85%   (baseline 66%)
 *   G2. entity recall              ≥ 90%   (baseline saturates at 100% on
 *       surface detection; the model must not regress below 90% while doing
 *       the harder job of proposing actual referents)
 *   G3. intent accuracy            ≥ 60%   (baseline 38%)
 *   G4. false-clarify rate on clear controls ≤ 15%  (baseline 10% + 5)
 *   G5. context grounding rate     ≥ 75% (6/8; baseline 0% — the headline gap)
 * Rationale: the model must beat the baseline by margins that survive battery
 * noise (n=50), and must not buy recall by pestering users on clear inputs.
 * If it fails, the rules engine stays and the failure is reported as-is.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { interpret, interpretWithModel, type TranslationOutput, type RiskCategory } from '../src/translator';
import { AnthropicBackend } from '../src/perception';

const HERE = dirname(fileURLToPath(import.meta.url));

interface EvalCase {
  id: string;
  category: string;
  text: string;
  context?: string[];
  risk: RiskCategory;
  expect: {
    clarify: boolean;
    entities: string[];
    intent: string;
    intent_not?: string;
    canonical_mentions?: string[];
  };
}

interface Battery { version: string; frozen: string; cases: EvalCase[] }

const battery: Battery = JSON.parse(readFileSync(join(HERE, 'battery.json'), 'utf8'));

function predictedClarify(out: TranslationOutput): boolean {
  return out.clarifying_questions.length > 0;
}

interface CaseResult {
  id: string;
  category: string;
  clarify_ok: boolean;
  entity_recall: number | null;
  intent_ok: boolean;
  grounding_ok: boolean | null;
}

function gradeCase(c: EvalCase, out: TranslationOutput): CaseResult {
  const clarify_ok = predictedClarify(out) === c.expect.clarify;

  let entity_recall: number | null = null;
  if (c.expect.entities.length > 0) {
    const found = new Set(out.recovered_entities.map((e) => e.original.toLowerCase()));
    const hits = c.expect.entities.filter((e) => found.has(e.toLowerCase())).length;
    entity_recall = hits / c.expect.entities.length;
  }

  let intent_ok = out.recovered_intent.type === c.expect.intent;
  if (c.expect.intent_not && out.recovered_intent.type === c.expect.intent_not) intent_ok = false;

  let grounding_ok: boolean | null = null;
  if (c.expect.canonical_mentions) {
    const canon = out.canonical_translation.toLowerCase();
    grounding_ok = c.expect.canonical_mentions.every((m) => canon.includes(m.toLowerCase()));
  }

  return { id: c.id, category: c.category, clarify_ok, entity_recall, intent_ok, grounding_ok };
}

function summarize(results: CaseResult[], engine: string) {
  const n = results.length;
  const clarifyAcc = results.filter((r) => r.clarify_ok).length / n;
  const recallCases = results.filter((r) => r.entity_recall !== null);
  const entityRecall = recallCases.length
    ? recallCases.reduce((s, r) => s + (r.entity_recall ?? 0), 0) / recallCases.length
    : null;
  const intentAcc = results.filter((r) => r.intent_ok).length / n;
  const controls = results.filter((r) => r.category === 'clear_control');
  const falseClarify = controls.length
    ? controls.filter((r) => !r.clarify_ok).length / controls.length
    : null;
  const grounded = results.filter((r) => r.grounding_ok !== null);
  const groundingRate = grounded.length
    ? grounded.filter((r) => r.grounding_ok).length / grounded.length
    : null;
  const summary = {
    engine,
    battery_version: battery.version,
    n,
    clarify_accuracy: round(clarifyAcc),
    entity_recall: entityRecall === null ? null : round(entityRecall),
    intent_accuracy: round(intentAcc),
    false_clarify_rate_controls: falseClarify === null ? null : round(falseClarify),
    context_grounding_rate: groundingRate === null ? null : round(groundingRate),
    per_case: results,
  };
  const file = join(HERE, `results-${engine.replace(/[^a-z0-9._-]/gi, '_')}.json`);
  writeFileSync(file, JSON.stringify(summary, null, 2));
  // eslint-disable-next-line no-console
  console.log(
    `[eval] engine=${engine} n=${n} clarify=${pct(clarifyAcc)} recall=${entityRecall === null ? 'n/a' : pct(entityRecall)} ` +
    `intent=${pct(intentAcc)} falseClarify(controls)=${falseClarify === null ? 'n/a' : pct(falseClarify)} ` +
    `grounding=${groundingRate === null ? 'n/a' : pct(groundingRate)} → ${file}`,
  );
  return summary;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

describe(`translator eval battery v${battery.version} (frozen ${battery.frozen})`, () => {
  it('battery integrity: 50 cases, unique ids, valid risk categories', () => {
    expect(battery.cases.length).toBe(50);
    const ids = new Set(battery.cases.map((c) => c.id));
    expect(ids.size).toBe(50);
    for (const c of battery.cases) {
      expect(['casual', 'advice', 'high-stakes', 'safety-critical']).toContain(c.risk);
    }
  });

  it('rules engine baseline (offline, always runs)', () => {
    const results = battery.cases.map((c) => gradeCase(c, interpret(c.text, c.risk)));
    const s = summarize(results, 'rules');
    // The baseline is recorded, not gated — whatever it is, it is.
    expect(s.n).toBe(50);
  });

  it('model engine (runs only with RPCS1_EVAL_ANTHROPIC_API_KEY; BYO-key)', async () => {
    const apiKey = process.env.RPCS1_EVAL_ANTHROPIC_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.log('[eval] RPCS1_EVAL_ANTHROPIC_API_KEY not set — model eval skipped (no fabricated numbers).');
      return;
    }
    const backend = new AnthropicBackend({ apiKey, model: process.env.RPCS1_EVAL_MODEL });
    const results: CaseResult[] = [];
    for (const c of battery.cases) {
      const out = await interpretWithModel(c.text, backend, { risk: c.risk, context: c.context, fallbackToRules: false });
      results.push(gradeCase(c, out));
    }
    summarize(results, backend.name);
  }, 600_000);
});
