/**
 * Entropy Routing — the commit-vs-clarify layer.
 *
 * Maintains a posterior over competing interpretations of an ambiguous input
 * and decides, from the ENTROPY of that posterior, whether to commit to the
 * dominant reading, present the live options, or ask a clarifying question.
 *
 * This is Paper 9's AR choice (commit vs clarify) made operational, and the
 * k-hypothesis generalization of the commitment block in Observer Requirements
 * (T-OR-1: estimate → detect → commit). The underlying mathematics is standard
 * multi-hypothesis sequential analysis (MSPRT lineage — Armitage 1950;
 * Baum–Veeravalli 1994); posterior-entropy stopping is a known approximation
 * of its rule. Credited as standard; the contribution here is architectural:
 * wiring it into the RPCS-1 receiver pipeline so ambiguity is resolved at the
 * receiver's own AR setting instead of being force-collapsed.
 *
 * Design rules (match the rest of core):
 *   - Deterministic and explainable. No ML, no API calls. Likelihood scoring
 *     is pluggable: the built-in scorer is lexical (cue matching); an LLM
 *     scorer can inject through the same `Likelihoods` shape, clearly labeled
 *     by the caller.
 *   - SILENT COMMIT ON CLEAN INPUT. When one reading dominates, the layer
 *     commits and stays out of the way — a router that always asks gets
 *     ignored (same contract as the Mirror's zero-fork rule).
 *   - Contract-first: pure functions of their inputs. No web-app, DOM, or
 *     session assumptions.
 *   - Honest scope: entropy measures ambiguity BETWEEN the supplied
 *     hypotheses. It cannot detect that the true intent is missing from the
 *     hypothesis set (out-of-set error is invisible to T). Callers should
 *     include a catch-all hypothesis when the set is not exhaustive.
 */

import type { ReceiverProfile } from './types.js';

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface IntentHypothesis {
  /** Stable id, e.g. 'automation' */
  id: string;
  /** Short human label, e.g. 'wants automation software' */
  label: string;
  /**
   * Lexical cues for the built-in scorer (lowercase substrings/words).
   * Optional when likelihoods are supplied externally.
   */
  cues?: string[];
  /** Prior weight (relative; normalized internally). Default 1. */
  prior?: number;
}

/** Per-hypothesis likelihood of the observed evidence, keyed by hypothesis id. */
export type Likelihoods = Record<string, number>;

export interface PosteriorEntry {
  id: string;
  label: string;
  p: number;
}

export interface Posterior {
  entries: PosteriorEntry[]; // sorted by p descending
  /** Shannon entropy in nats: −Σ p ln p */
  entropy: number;
  /** entropy / ln(k) ∈ [0,1]; 0 = one reading dominates, 1 = maximal ambiguity */
  normalizedEntropy: number;
  /** p(top) − p(second); 1 when k = 1 */
  margin: number;
}

export type RoutingMode =
  | 'commit'            // one reading dominates — proceed silently
  | 'commit_with_note'  // proceed on the top reading, but disclose the live alternative
  | 'present_options'   // no dominant reading — show the top readings as choices
  | 'clarify';          // ambiguity too high — ask one targeted question

export interface RoutingThresholds {
  /** commit when normalizedEntropy ≤ tCommit */
  tCommit: number;
  /** clarify when normalizedEntropy ≥ tClarify; between: present/note */
  tClarify: number;
  /** minimum top-vs-second margin required for a silent commit */
  minCommitMargin: number;
}

export interface RoutingDecision {
  mode: RoutingMode;
  top: PosteriorEntry;
  posterior: Posterior;
  thresholds: RoutingThresholds;
  /** Deterministic one-line trace of why this mode was chosen. */
  why: string;
  /**
   * For 'clarify': a single question separating the top two readings.
   * For 'present_options': the readings to show. Null on commit.
   */
  clarifyingQuestion: string | null;
  options: PosteriorEntry[] | null;
}

// ─── Entropy & posterior mechanics ────────────────────────────────────────────

const EPS = 1e-12;

/** Shannon entropy (nats) of a normalized distribution. */
export function shannonEntropy(ps: number[]): number {
  let h = 0;
  for (const p of ps) if (p > EPS) h -= p * Math.log(p);
  return h;
}

function normalizeWeights(ids: string[], w: Record<string, number>): Record<string, number> {
  let sum = 0;
  for (const id of ids) sum += Math.max(0, w[id] ?? 0);
  const out: Record<string, number> = {};
  if (sum <= EPS) {
    // No evidence discriminates — fall back to uniform, never divide by zero.
    for (const id of ids) out[id] = 1 / ids.length;
  } else {
    for (const id of ids) out[id] = Math.max(0, w[id] ?? 0) / sum;
  }
  return out;
}

/**
 * Build a posterior from hypotheses + likelihoods (single-shot Bayes).
 * posterior ∝ prior × likelihood, with additive smoothing so that a zero
 * likelihood demotes rather than annihilates a hypothesis (evidence is
 * lexical and noisy; hard zeros overstate it). Default 0.01 — RTEB v1 showed
 * that 0.05 inflates the entropy floor at k=7 enough to push clean single-cue
 * posteriors past the commit boundary (71% ask rate on clear items: the
 * over-asking defect). Sharper smoothing restores silent commits on clean
 * input while zero-evidence inputs still land exactly uniform.
 */
export function computePosterior(
  hypotheses: IntentHypothesis[],
  likelihoods: Likelihoods,
  opts: { smoothing?: number } = {},
): Posterior {
  if (hypotheses.length === 0) throw new Error('computePosterior: empty hypothesis set');
  const smoothing = opts.smoothing ?? 0.01;
  const ids = hypotheses.map((h) => h.id);
  const prior = normalizeWeights(ids, Object.fromEntries(hypotheses.map((h) => [h.id, h.prior ?? 1])));
  const raw: Record<string, number> = {};
  for (const h of hypotheses) raw[h.id] = prior[h.id] * ((likelihoods[h.id] ?? 0) + smoothing);
  const post = normalizeWeights(ids, raw);
  return toPosterior(hypotheses, post);
}

/**
 * Multi-turn update: blend the previous posterior (as the new prior) with new
 * likelihoods, under exponential forgetting λ ∈ [0,1]:
 *   λ = 1 → previous posterior fully trusted (pure recursive Bayes);
 *   λ = 0 → previous posterior discarded (each turn starts fresh).
 * Forgetting is the R-5 urgency analog: old evidence about intent expires as
 * the conversation moves.
 */
export function updatePosterior(
  previous: Posterior,
  hypotheses: IntentHypothesis[],
  likelihoods: Likelihoods,
  opts: { forgetting?: number; smoothing?: number } = {},
): Posterior {
  const lambda = clamp01(opts.forgetting ?? 0.7);
  const k = hypotheses.length;
  const prevP: Record<string, number> = {};
  for (const e of previous.entries) prevP[e.id] = e.p;
  const blended = hypotheses.map((h) => ({
    ...h,
    prior: lambda * (prevP[h.id] ?? 1 / k) + (1 - lambda) * (1 / k),
  }));
  return computePosterior(blended, likelihoods, { smoothing: opts.smoothing });
}

function toPosterior(hypotheses: IntentHypothesis[], p: Record<string, number>): Posterior {
  const entries = hypotheses
    .map((h) => ({ id: h.id, label: h.label, p: p[h.id] }))
    .sort((a, b) => b.p - a.p || a.id.localeCompare(b.id));
  const entropy = shannonEntropy(entries.map((e) => e.p));
  const k = entries.length;
  const normalizedEntropy = k > 1 ? entropy / Math.log(k) : 0;
  const margin = k > 1 ? entries[0].p - entries[1].p : 1;
  return { entries, entropy, normalizedEntropy, margin };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ─── Built-in lexical scorer (deterministic; pluggable) ───────────────────────

/**
 * Score likelihoods by cue matching: count each hypothesis's cue hits in the
 * text (whole-word for single tokens, substring for phrases). Deterministic
 * and transparent; an LLM scorer can replace this via the same Likelihoods
 * shape, and MUST be labeled as model-derived by the caller.
 */
export function scoreLexicalLikelihoods(text: string, hypotheses: IntentHypothesis[]): Likelihoods {
  const lower = text.toLowerCase();
  const out: Likelihoods = {};
  for (const h of hypotheses) {
    let hits = 0;
    for (const cue of h.cues ?? []) {
      const c = cue.toLowerCase();
      if (c.includes(' ')) {
        if (lower.includes(c)) hits += 1;
      } else {
        const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(lower)) hits += 1;
      }
    }
    out[h.id] = hits;
  }
  return out;
}

// ─── Thresholds from the receiver profile ─────────────────────────────────────

/**
 * Derive routing thresholds from the receiver's AR setting, mirroring the
 * intake bands (AR > 60 → commit; AR < 40 → clarify; middle → note):
 * a high-AR receiver wants the system to resolve ambiguity for them, so the
 * commit region widens; a low-AR receiver wants to be asked, so the clarify
 * region widens. FT nudges the note band: literal receivers (high FT) get the
 * alternative disclosed rather than silently dropped.
 */
export function thresholdsFromProfile(profile?: ReceiverProfile): RoutingThresholds {
  const ar = profile?.AR ?? 50;
  const ft = profile?.FT ?? 50;
  // Anchors: neutral receiver → tCommit 0.45, tClarify 0.75.
  const tCommit = clamp01(0.45 + ((ar - 50) / 100) * 0.3); // AR 0 → 0.30, AR 100 → 0.60
  const tClarify = clamp01(0.75 + ((ar - 50) / 100) * 0.3); // AR 0 → 0.60, AR 100 → 0.90
  const minCommitMargin = ft > 60 ? 0.25 : 0.15; // literal receivers need a clearer winner
  return { tCommit, tClarify, minCommitMargin };
}

// ─── The routing decision ─────────────────────────────────────────────────────

/**
 * Decide commit / commit_with_note / present_options / clarify from the
 * posterior's normalized entropy and top margin.
 */
export function routeByEntropy(
  posterior: Posterior,
  thresholds?: Partial<RoutingThresholds>,
  profile?: ReceiverProfile,
): RoutingDecision {
  const t = { ...thresholdsFromProfile(profile), ...thresholds };
  if (t.tClarify <= t.tCommit) throw new Error('routeByEntropy: tClarify must exceed tCommit');
  const { normalizedEntropy: T, margin } = posterior;
  const top = posterior.entries[0];
  const second = posterior.entries[1] ?? null;

  let mode: RoutingMode;
  let why: string;
  if (T <= t.tCommit && margin >= t.minCommitMargin) {
    mode = 'commit';
    why = `T̂=${T.toFixed(2)} ≤ ${t.tCommit.toFixed(2)} and margin ${margin.toFixed(2)} ≥ ${t.minCommitMargin}: one reading dominates — commit silently.`;
  } else if (T <= t.tCommit && margin >= 0.5 * t.minCommitMargin) {
    mode = 'commit_with_note';
    why = `T̂=${T.toFixed(2)} is low but the top two readings are close (margin ${margin.toFixed(2)}): commit, disclosing the alternative.`;
  } else if (T <= t.tCommit) {
    mode = 'present_options';
    why = `T̂=${T.toFixed(2)} is low but the top two readings are a near-tie (margin ${margin.toFixed(2)} < ${(0.5 * t.minCommitMargin).toFixed(2)}): a real fork — show both.`;
  } else if (T < t.tClarify) {
    mode = 'present_options';
    why = `T̂=${T.toFixed(2)} sits between commit (${t.tCommit.toFixed(2)}) and clarify (${t.tClarify.toFixed(2)}): show the live readings.`;
  } else {
    mode = 'clarify';
    why = `T̂=${T.toFixed(2)} ≥ ${t.tClarify.toFixed(2)}: too many readings are live — ask before acting.`;
  }

  // Zero-evidence guard: when no reading is supported (posterior ≈ uniform,
  // margin ≈ 0 at maximal entropy), a "closer to X or Y?" question would be a
  // FALSE BINARY between arbitrary tied hypotheses (live-trace finding,
  // 2026-07-29: "pay cast" produced a choice among unrelated product intents).
  // Ask open-endedly instead, and return no options — there is nothing to rank.
  const noEvidence = margin < 1e-9 && T > 0.99;
  const openQuestion =
    'I can read that several ways and nothing in the message settles it \u2014 can you tell me a bit more about what you\u2019re after?';
  const clarifyingQuestion =
    mode !== 'clarify'
      ? null
      : noEvidence || !second
        ? openQuestion
        : `Just to make sure I read you right — is this closer to "${top.label}" or "${second.label}"?`;
  const options =
    (mode === 'present_options' || mode === 'clarify') && !noEvidence
      ? posterior.entries.filter((e) => e.p >= 0.5 / posterior.entries.length)
      : null;

  return { mode, top, posterior, thresholds: t, why, clarifyingQuestion, options };
}

// ─── One-call convenience pipeline ────────────────────────────────────────────

export interface RouteIntentOptions {
  profile?: ReceiverProfile;
  thresholds?: Partial<RoutingThresholds>;
  /** Previous turn's posterior, for multi-turn accumulation. */
  previous?: Posterior;
  /** Forgetting factor for multi-turn updates (default 0.7). */
  forgetting?: number;
  /** External likelihoods (e.g. model-derived); overrides the lexical scorer. */
  likelihoods?: Likelihoods;
}

/**
 * text + hypotheses → posterior → routing decision, in one call.
 * Uses the deterministic lexical scorer unless `likelihoods` is supplied.
 */
export function routeIntent(
  text: string,
  hypotheses: IntentHypothesis[],
  opts: RouteIntentOptions = {},
): RoutingDecision {
  const like = opts.likelihoods ?? scoreLexicalLikelihoods(text, hypotheses);
  const posterior = opts.previous
    ? updatePosterior(opts.previous, hypotheses, like, { forgetting: opts.forgetting })
    : computePosterior(hypotheses, like);
  return routeByEntropy(posterior, opts.thresholds, opts.profile);
}

// ─── Default intent hypothesis set (generic layer-1; callers should override) ─

/**
 * A generic starter set for "what does the user actually want?" routing.
 * Includes the catch-all 'other' per the honest-scope rule above.
 */
export const DEFAULT_INTENT_HYPOTHESES: IntentHypothesis[] = [
  { id: 'save_time', label: 'save time / automate a task', cues: ['automate', 'automatic', 'faster', 'save time', 'efficient', 'efficiency', 'streamline', 'workflow'] },
  { id: 'save_money', label: 'reduce cost', cues: ['cost', 'cheaper', 'save money', 'budget', 'price', 'expensive', 'afford'] },
  { id: 'learn', label: 'learn / understand something', cues: ['learn', 'understand', 'explain', 'how does', 'what is', 'teach', 'tutorial', 'course'] },
  { id: 'build', label: 'build something new', cues: ['build', 'create', 'make', 'develop', 'prototype', 'design', 'implement'] },
  { id: 'buy', label: 'choose / buy a product', cues: ['buy', 'purchase', 'recommend', 'which one', 'best tool', 'compare', 'pricing', 'subscription'] },
  { id: 'troubleshoot', label: 'fix something broken', cues: ['fix', 'broken', 'error', 'bug', 'not working', "doesn't work", 'crash', 'issue', 'debug'] },
  { id: 'other', label: 'something else (out of set)', cues: [] },
];
