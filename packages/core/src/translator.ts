// ── RPCS-1 Translator — canonical implementation (single source of truth) ──────
// The web package re-exports this engine; do not fork it.
//
// NAMING NOTE (collision fix): this module's ambiguity scoring uses the HF-HATP
// factor set, whose protocol abbreviations (IC, UE, EC, NM, SG, TI) collide
// letter-for-letter with the RPCS-1 *receiver* primitives (TI, SG, FT, UE, AR).
// To remove that ambiguity in code, the HF-HATP factors are spelled out here
// (interpConf, userEvid, epistemic, narrative, semGap, transInteg). They are a
// DIFFERENT construct from ReceiverProfile and must not be conflated.

import { deriveRenderingDirectives, type RenderingDirectives } from './intake.js';
import type { ReceiverProfile } from './types.js';
import {
  readingsToFactors,
  entitiesToRecovered,
  type ModelBackend,
  type PerceptionResult,
} from './perception.js';

type RiskCategory = 'casual' | 'advice' | 'high-stakes' | 'safety-critical';
type ARLevel = 'AR0' | 'AR1' | 'AR2' | 'AR3' | 'AR4' | 'AR5';

const RISK_THRESHOLDS: Record<RiskCategory, number> = {
  casual: 0.15,
  advice: 0.30,
  'high-stakes': 0.60,
  'safety-critical': 0.85,
};

// HF-HATP v1.9 factor weights (protocol abbrevs in comments — NOT receiver primitives)
const HATP_WEIGHTS = {
  interpConf: 0.30, // IC — interpretation confidence
  userEvid: 0.25,   // UE — user evidence
  epistemic: 0.15,  // EC — epistemic commitment
  narrative: 0.10,  // NM — narrative momentum
  semGap: 0.10,     // SG — semantic gap (penalty)
  transInteg: 0.10, // TI — translation integrity (penalty)
};

// ── Types ───────────────────────────────────────────────────────────

/** HF-HATP candidate factor vector (distinct from ReceiverProfile). */
interface HatpFactors {
  label: string;
  interpConf: number;
  userEvid: number;
  epistemic: number;
  narrative: number;
  semGap: number;
  transInteg: number;
  ti_penalty_multiplier?: number;
}

interface Candidate extends HatpFactors {
  ti_penalty_multiplier: number;
  score: number;
}

interface EntityCandidate {
  text: string;
  confidence: number;
}

interface RecoveredEntity {
  original: string;
  category: 'pronoun' | 'location' | 'time' | 'action' | 'unspecified';
  candidate: EntityCandidate;
  alternatives: EntityCandidate[];
}

interface RecoveredIntent {
  type: 'question' | 'correction' | 'explanation' | 'planning' | 'opinion' | 'instruction' | 'emotional_support' | 'research' | 'general';
  confidence: number;
}

interface TranslationOutput {
  original: string;
  recovered_entities: RecoveredEntity[];
  recovered_intent: RecoveredIntent;
  canonical_translation: string;
  translation_integrity: number;
  confidence: number;
  ar_level: ARLevel;
  playback_required: boolean;
  clarifying_questions: string[];
  candidates: EntityCandidate[];
  margin: number;
  /**
   * Which perception engine produced the candidates the resolver decided on:
   * 'rules' (legacy keyword/regex heuristics) or a backend name such as
   * 'anthropic:claude-haiku-4-5'. The decision layer is deterministic either way.
   */
  engine?: string;
  /** Model path only: paraphrases of the top competing readings (best first). */
  reading_paraphrases?: string[];
}

interface NormalizeResult {
  original: string;
  fragments: string[];
  normalized: string;
  fragment_count: number;
}

interface SplitResult {
  original: string;
  intents: string[];
  count: number;
}

interface RewriteResult {
  original: string;
  style: string;
  style_label: string;
  style_description: string;
  rewrite_instructions: string;
  rewritten: null;
  note: string;
}

interface RouteResult {
  task_type: string;
  description: string;
  primary_route: string;
  fallback_route: string;
  risk_category: string;
  target_audience: string;
  strategy: string;
  objective?: string;
}

interface ScoreResult {
  candidates: Candidate[];
  scores: number[];
  margin: number;
  risk_category: RiskCategory;
  threshold: number;
  should_collapse: boolean;
  ar_level: ARLevel;
  winner: string | null;
}

// ── Scoring engine ──────────────────────────────────────────────────

function computeScore(c: HatpFactors): number {
  const w = HATP_WEIGHTS;
  const penalty = (1 - c.transInteg) * (c.ti_penalty_multiplier ?? 1.0);
  return (
    w.interpConf * c.interpConf +
    w.userEvid * c.userEvid +
    w.epistemic * c.epistemic +
    w.narrative * c.narrative -
    w.semGap * c.semGap -
    w.transInteg * penalty
  );
}

function resolveAmbiguity(candidatesInput: HatpFactors[], risk: RiskCategory = 'advice'): ScoreResult {
  const candidates = candidatesInput.map((c) => ({
    ...c,
    ti_penalty_multiplier: c.ti_penalty_multiplier ?? 1.0,
    score: 0,
  }));
  for (const c of candidates) c.score = computeScore(c);

  candidates.sort((a, b) => b.score - a.score);
  const scores = candidates.map((c) => c.score);
  const margin = scores[0] - (scores[1] ?? 0);
  const threshold = RISK_THRESHOLDS[risk];

  let shouldCollapse: boolean;
  let arLevel: ARLevel;
  let winner: string | null;

  if (candidates.length === 1) {
    shouldCollapse = true;
    arLevel = 'AR0';
    winner = candidates[0].label;
  } else if (margin > threshold) {
    shouldCollapse = true;
    if (['safety-critical', 'high-stakes'].includes(risk) && margin < threshold + 0.1) {
      arLevel = 'AR4';
    } else {
      arLevel = margin > threshold + 0.3 ? 'AR0' : 'AR1';
    }
    winner = candidates[0].label;
  } else {
    shouldCollapse = false;
    if (margin > threshold * 0.8) arLevel = 'AR4';
    else if (margin > threshold * 0.5) arLevel = 'AR3';
    else if (margin > threshold * 0.2) arLevel = 'AR2';
    else arLevel = 'AR5';
    winner = null;
  }

  return { candidates, scores, margin, risk_category: risk, threshold, should_collapse: shouldCollapse, ar_level: arLevel, winner };
}

// ── Stage 1: Entity Recovery ───────────────────────────────────

const AMBIGUOUS_REFERENCES = [
  { word: 'they', category: 'pronoun' as const },
  { word: 'them', category: 'pronoun' as const },
  { word: 'their', category: 'pronoun' as const },
  { word: 'he', category: 'pronoun' as const },
  { word: 'him', category: 'pronoun' as const },
  { word: 'she', category: 'pronoun' as const },
  { word: 'her', category: 'pronoun' as const },
  { word: 'it', category: 'pronoun' as const },
  { word: 'its', category: 'pronoun' as const },
  { word: 'there', category: 'location' as const },
  { word: 'that', category: 'unspecified' as const },
  { word: 'those', category: 'unspecified' as const },
  { word: 'this', category: 'unspecified' as const },
  { word: 'these', category: 'unspecified' as const },
  { word: 'someone', category: 'pronoun' as const },
  { word: 'somebody', category: 'pronoun' as const },
  { word: 'somewhere', category: 'location' as const },
  { word: 'sometime', category: 'time' as const },
  { word: 'something', category: 'unspecified' as const },
];

const VAGUE_SIGNALS = [
  'thing', 'stuff', 'somehow', 'kind of', 'sort of', 'type of',
  'whatever', 'anyway', 'anything', 'anywhere', 'anyone',
  'you know', 'etc', 'whatever you think',
];

function recoverEntities(text: string): { entities: RecoveredEntity[]; hasAmbiguity: boolean } {
  const lower = text.toLowerCase();
  const entities: RecoveredEntity[] = [];
  let hasAmbiguity = false;
  const seen = new Set<string>();

  for (const ref of AMBIGUOUS_REFERENCES) {
    const regex = new RegExp('\\b' + ref.word + '\\b', 'i');
    if (regex.test(lower) && !seen.has(ref.word)) {
      seen.add(ref.word);
      hasAmbiguity = true;
      const defaultCandidates: EntityCandidate[] = [];
      if (['they', 'them', 'their'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unknown group]', confidence: 0.50 }, { text: '[the people being discussed]', confidence: 0.35 });
      } else if (['he', 'him'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unknown male]', confidence: 0.50 });
      } else if (['she', 'her'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unknown female]', confidence: 0.50 });
      } else if (['it', 'its'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unknown object/topic]', confidence: 0.50 });
      } else if (['there', 'somewhere'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unknown location]', confidence: 0.50 });
      } else if (['that', 'those', 'this', 'these'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unspecified referent]', confidence: 0.50 });
      } else if (['someone', 'somebody'].includes(ref.word)) {
        defaultCandidates.push({ text: '[unknown person]', confidence: 0.50 });
      } else if (ref.word === 'something') {
        defaultCandidates.push({ text: '[unspecified thing]', confidence: 0.50 });
      }
      entities.push({
        original: ref.word,
        category: ref.category,
        candidate: defaultCandidates[0] || { text: '[ambiguous]', confidence: 0.50 },
        alternatives: defaultCandidates.slice(1),
      });
    }
  }
  return { entities, hasAmbiguity };
}

const INTENT_PATTERNS: Array<{ type: RecoveredIntent['type']; patterns: RegExp[] }> = [
  { type: 'question', patterns: [/^what\b/i, /^where\b/i, /^when\b/i, /^why\b/i, /^how\b/i, /^who\b/i, /^which\b/i, /\?$/] },
  { type: 'instruction', patterns: [/^(please |could you |can you |would you |i need you to |make |create |write |find |show )/i] },
  { type: 'correction', patterns: [/(actually|that's not|you're wrong|incorrect|mistake|error)/i] },
  { type: 'explanation', patterns: [/(explain|what is |how does |tell me about|describe|define)/i] },
  { type: 'planning', patterns: [/(plan|prepare|organize|schedule|arrange|strategy|next steps)/i] },
  { type: 'opinion', patterns: [/(think|believe|opinion|feel about|recommend|suggest|best|better)/i] },
  { type: 'emotional_support', patterns: [/(feel|feeling|sad|angry|upset|stressed|worried|anxious)/i] },
  { type: 'research', patterns: [/(research|study|analyze|investigate|find out|learn about|data on)/i] },
];

function recoverIntent(text: string): RecoveredIntent {
  for (const { type, patterns } of INTENT_PATTERNS) {
    for (const p of patterns) if (p.test(text)) return { type, confidence: 0.85 };
  }
  if (/\?$/.test(text.trim())) return { type: 'question', confidence: 0.70 };
  return { type: 'general', confidence: 0.60 };
}

function buildCanonicalTranslation(text: string, entities: RecoveredEntity[]): string {
  if (entities.length === 0) return text;
  let translated = text;
  for (const entity of entities) {
    const regex = new RegExp('\\b' + entity.original + '\\b', 'gi');
    translated = translated.replace(regex, entity.candidate.text);
  }
  return translated;
}

function interpret(text: string, risk: RiskCategory = 'advice', profile?: ReceiverProfile): TranslationOutput {
  const { entities, hasAmbiguity } = recoverEntities(text);
  const intent = recoverIntent(text);
  const canonical = buildCanonicalTranslation(text, entities);

  const lower = text.toLowerCase().trim();
  const vagueCount = VAGUE_SIGNALS.filter((s) => lower.includes(s)).length;
  const totalSignals = (hasAmbiguity ? 1 : 0) + vagueCount;
  const ambiguitySeverity = Math.min(1.0, totalSignals / 4);

  const dynamicCandidates: HatpFactors[] = [];
  if (!hasAmbiguity && vagueCount === 0) {
    dynamicCandidates.push({ label: 'literal', interpConf: 0.85, userEvid: 0.80, epistemic: 0.80, narrative: 0.70, semGap: 0.10, transInteg: 1.00 });
  } else {
    const literalIC = Math.max(0.3, 0.8 - ambiguitySeverity * 0.5);
    dynamicCandidates.push({ label: 'literal', interpConf: literalIC, userEvid: 0.70, epistemic: 0.60, narrative: 0.60, semGap: 0.20, transInteg: 0.95 });
    if (hasAmbiguity) {
      dynamicCandidates.push({ label: 'ambiguous_reference', interpConf: 0.30, userEvid: 0.40, epistemic: 0.50, narrative: 0.60, semGap: 0.75, transInteg: 0.55, ti_penalty_multiplier: 1.5 });
    }
    if (vagueCount > 0) {
      dynamicCandidates.push({ label: 'underspecified', interpConf: 0.35, userEvid: 0.40, epistemic: 0.50, narrative: 0.60, semGap: 0.70, transInteg: 0.60, ti_penalty_multiplier: 1.5 });
    }
  }
  if (dynamicCandidates.length === 1) {
    const c0 = dynamicCandidates[0];
    dynamicCandidates.push({ label: 'alt', interpConf: c0.interpConf - 0.2, userEvid: c0.userEvid - 0.1, epistemic: c0.epistemic - 0.1, narrative: c0.narrative, semGap: c0.semGap + 0.1, transInteg: c0.transInteg - 0.1 });
  }

  const effectiveRisk = ambiguitySeverity > 0.3 && risk === 'casual' ? 'advice' : risk;
  const resolution = resolveAmbiguity(dynamicCandidates, effectiveRisk);
  const ti = resolution.candidates[0]?.transInteg ?? 0.5;

  let playbackRequired = ti < 0.95 || (risk === 'safety-critical' && hasAmbiguity);
  const questions: string[] = [];
  if (hasAmbiguity) {
    for (const entity of entities) questions.push('What does "' + entity.original + '" refer to?');
  }
  if (risk === 'safety-critical' || risk === 'high-stakes') {
    if (questions.length === 0) questions.push('I want to verify — is this exactly what you mean?');
  }

  // Receiver-profile modulation: the user's R̂ bends clarify-vs-commit.
  if (profile) {
    if (profile.AR > 60 && risk !== 'safety-critical' && !hasAmbiguity) playbackRequired = false;
    if (profile.AR < 40 && resolution.margin < resolution.threshold * 1.5) playbackRequired = true;
    if (profile.FT > 60 && questions.length === 0 && (intent.confidence < 0.85 || vagueCount > 0)) {
      questions.push('To be explicit: did you mean this literally as written?');
    }
  }

  const displayCandidates = entities.map((e) => e.candidate);
  if (displayCandidates.length === 0 && resolution.candidates.length > 0) {
    displayCandidates.push({ text: resolution.candidates[0].label, confidence: resolution.candidates[0].score });
  }

  return {
    original: text,
    recovered_entities: entities,
    recovered_intent: intent,
    canonical_translation: canonical,
    translation_integrity: Math.round(ti * 100),
    confidence: Math.round((resolution.candidates[0]?.score ?? 0.5) * 100) / 100,
    ar_level: resolution.ar_level,
    playback_required: playbackRequired,
    clarifying_questions: questions,
    candidates: displayCandidates,
    margin: resolution.margin,
  };
}

// ── Model-backed interpret (perception: model; decision: deterministic RPCS-1) ─

interface InterpretModelOptions {
  risk?: RiskCategory;
  profile?: ReceiverProfile;
  /** Prior conversation turns (oldest first) for grounding referents. */
  context?: string[];
  /**
   * When the backend fails (network, key, malformed output), fall back to the
   * legacy rules engine instead of throwing. Default true. The output's
   * `engine` field always tells you which path actually ran.
   */
  fallbackToRules?: boolean;
}

/**
 * Interpret `text` using a model-backed perception layer.
 *
 * Division of labor: the backend PROPOSES candidate readings (entities, intent
 * hypotheses, HF-HATP factor estimates); the deterministic RPCS-1 resolver
 * DECIDES — collapse vs clarify, AR level, playback — via the same
 * resolveAmbiguity / risk-threshold machinery as the rules path. Given
 * identical perception output, the decision is identical, every time.
 */
async function interpretWithModel(
  text: string,
  backend: ModelBackend,
  options: InterpretModelOptions = {},
): Promise<TranslationOutput> {
  const risk = options.risk ?? 'advice';
  let perception: PerceptionResult;
  try {
    perception = await backend.perceive(text, options.context);
  } catch (err) {
    if (options.fallbackToRules === false) throw err;
    const fallback = interpret(text, risk, options.profile);
    fallback.engine = 'rules';
    return fallback;
  }

  const entities = entitiesToRecovered(perception.entities);
  const hasAmbiguity = entities.length > 0;
  const intent = perception.intents[0];

  // Deterministic decision on model-proposed candidates (unchanged machinery).
  const factors = readingsToFactors(perception.readings);
  const resolution = resolveAmbiguity(factors, risk);
  const top = resolution.candidates[0];
  const ti = top?.transInteg ?? 0.5;

  let playbackRequired = ti < 0.95 || (risk === 'safety-critical' && hasAmbiguity);
  const questions: string[] = [];
  for (const entity of entities) {
    if (entity.candidate.confidence < 0.75) {
      questions.push('What does "' + entity.original + '" refer to?');
    }
  }
  if (!resolution.should_collapse && resolution.candidates.length > 1) {
    const alts = resolution.candidates.slice(0, 2).map((c) => c.label).join('" or "');
    questions.push('Did you mean "' + alts + '"?');
  }
  if ((risk === 'safety-critical' || risk === 'high-stakes') && questions.length === 0) {
    questions.push('I want to verify — is this exactly what you mean?');
  }

  // Receiver-profile modulation: identical policy to the rules path.
  if (options.profile) {
    const profile = options.profile;
    if (profile.AR > 60 && risk !== 'safety-critical' && !hasAmbiguity) playbackRequired = false;
    if (profile.AR < 40 && resolution.margin < resolution.threshold * 1.5) playbackRequired = true;
    if (profile.FT > 60 && questions.length === 0 && intent.confidence < 0.85) {
      questions.push('To be explicit: did you mean this literally as written?');
    }
  }

  const displayCandidates = entities.map((e) => e.candidate);
  if (displayCandidates.length === 0 && resolution.candidates.length > 0) {
    displayCandidates.push({ text: resolution.candidates[0].label, confidence: resolution.candidates[0].score });
  }

  const paraphraseByLabel = new Map(perception.readings.map((r) => [r.label, r.paraphrase]));

  return {
    original: text,
    recovered_entities: entities,
    recovered_intent: intent,
    canonical_translation: perception.canonicalTranslation,
    translation_integrity: Math.round(ti * 100),
    confidence: Math.round((top?.score ?? 0.5) * 100) / 100,
    ar_level: resolution.ar_level,
    playback_required: playbackRequired,
    clarifying_questions: questions,
    candidates: displayCandidates,
    margin: resolution.margin,
    engine: backend.name,
    reading_paraphrases: resolution.candidates
      .map((c) => paraphraseByLabel.get(c.label))
      .filter((p): p is string => !!p),
  };
}

function normalizeText(text: string): NormalizeResult {
  const fragments = text.replace(/\.\.\./g, '\x00').replace(/\.\./g, '\x00').split('\x00').map((f) => f.trim()).filter(Boolean);
  return { original: text, fragments, normalized: fragments.length ? fragments.join(' ') : text, fragment_count: fragments.length || 1 };
}

function splitText(text: string): SplitResult {
  const parts = text.split(/(?:and\s+also|but\s+also|and|but|\.\s*|;\s*)/).map((p) => p.trim()).filter(Boolean);
  return { original: text, intents: parts, count: parts.length };
}

const REWRITE_STYLES: Record<string, { label: string; description: string; instructions: string }> = {
  technical: { label: 'Technical', description: 'Preserve exact language and precision', instructions: 'Use precise terminology. Maintain all technical details. Prefer passive voice where appropriate.' },
  plain: { label: 'Plain', description: 'Clear but not condescending', instructions: 'Use simple, clear language. Avoid jargon. Be direct but friendly.' },
  socially_gentle: { label: 'Socially Gentle', description: 'Soften tone to reduce confrontation', instructions: "Use softer framing. Replace accusations with observations. Add buffers like 'I think' and 'maybe'." },
  concise: { label: 'Concise', description: 'Shortest useful form', instructions: 'Cut all unnecessary words. Use bullet points. Remove pleasantries.' },
  detailed: { label: 'Detailed', description: 'Expanded with context and assumptions', instructions: 'Add context, explain reasoning, state assumptions. Include caveats and edge cases.' },
  direct: { label: 'Direct', description: 'Remove hedging, keep truth', instructions: 'Remove qualifying language. Be straightforward. State the truth without softening.' },
};

function rewriteText(text: string, style: string = 'plain'): RewriteResult {
  const info = REWRITE_STYLES[style];
  if (!info) {
    return { original: text, style, style_label: 'Unknown', style_description: '', rewrite_instructions: `Unknown style "${style}". Available: ${Object.keys(REWRITE_STYLES).join(', ')}`, rewritten: null, note: 'Invalid style requested.' };
  }
  return { original: text, style, style_label: info.label, style_description: info.description, rewrite_instructions: info.instructions, rewritten: null, note: 'Pass this payload to an LLM with the rewrite_instructions as the system prompt.' };
}

const TASK_ROUTES: Record<string, { description: string; recommended: string; fallback: string; risk: string }> = {
  code: { description: 'Code generation, debugging, refactoring', recommended: 'reasoning', fallback: 'fast', risk: 'high-stakes' },
  creative_writing: { description: 'Creative prose, storytelling, marketing copy', recommended: 'creative', fallback: 'balanced', risk: 'casual' },
  analysis: { description: 'Data analysis, research, summarization', recommended: 'reasoning', fallback: 'balanced', risk: 'advice' },
  chat: { description: 'General conversation, Q&A, assistance', recommended: 'balanced', fallback: 'fast', risk: 'casual' },
  translation: { description: 'Language translation, localization', recommended: 'balanced', fallback: 'fast', risk: 'advice' },
  reasoning: { description: 'Complex reasoning, math, logic puzzles', recommended: 'reasoning', fallback: 'balanced', risk: 'advice' },
  planning: { description: 'Project planning, task decomposition, scheduling', recommended: 'reasoning', fallback: 'balanced', risk: 'advice' },
  emotional: { description: 'Emotional support, empathy, venting', recommended: 'creative', fallback: 'balanced', risk: 'casual' },
};

function routeTask(taskType: string, objective?: string, allowMultiModel = false): RouteResult {
  const info = TASK_ROUTES[taskType];
  if (!info) {
    return { task_type: taskType, description: '', primary_route: '', fallback_route: '', risk_category: '', target_audience: 'plain', strategy: '', objective };
  }
  return {
    task_type: taskType,
    description: info.description,
    primary_route: info.recommended,
    fallback_route: info.fallback,
    risk_category: info.risk,
    target_audience: 'plain',
    strategy: allowMultiModel ? 'parallel' : 'primary_with_fallback',
    ...(objective ? { objective } : {}),
  };
}

function scoreCandidates(candidatesInput: HatpFactors[], risk: RiskCategory = 'casual'): ScoreResult {
  return resolveAmbiguity(candidatesInput, risk);
}

// ── Receiver-profile-driven rewrite (the vector replaces the fixed style) ─────

function directivesToInstructions(d: RenderingDirectives): string {
  const parts: string[] = [];
  parts.push(d.structure === 'bluf' ? 'Lead with the conclusion or answer first; put supporting detail afterward.' : d.structure === 'context_first' ? 'Build the context and reasoning first, then state the conclusion.' : 'Give a brief setup, then the main point.');
  parts.push(d.warmth === 'warm' ? 'Use a warm, expressive tone; acknowledge feeling where relevant.' : d.warmth === 'minimal' ? 'Keep the tone flat and factual; minimal pleasantries.' : 'Keep a lightly warm, neutral tone.');
  parts.push(d.explicitness === 'explicit_literal' ? 'State intent and meaning explicitly and literally. Do not rely on hints, idiom, or implication — spell out what is meant.' : d.explicitness === 'implication_ok' ? 'Implication, idiom, and subtext are fine; no need to over-explain.' : 'Be mostly explicit; avoid heavy reliance on subtext.');
  parts.push(d.revision === 'open_challenge' ? 'Challenge and reframe freely where warranted; the reader welcomes pushback.' : d.revision === 'consistent' ? 'Stay consistent; avoid abrupt reversals, and if you must change course, flag the change gently and explicitly.' : 'Revise where warranted, with balanced framing.');
  parts.push(d.ambiguity === 'commit' ? 'If the request is ambiguous, choose the most likely reading and answer it directly.' : d.ambiguity === 'clarify' ? 'If the request is ambiguous, surface the possible readings and ask which is meant before answering.' : 'If ambiguous, answer the most likely reading but note key alternatives.');
  return parts.join(' ');
}

function rewriteForProfile(text: string, profile: ReceiverProfile): RewriteResult {
  const d = deriveRenderingDirectives(profile);
  return {
    original: text,
    style: 'profile',
    style_label: 'Receiver-matched',
    style_description: `Tuned to R̂ = TI${profile.TI} SG${profile.SG} FT${profile.FT} UE${profile.UE} AR${profile.AR}`,
    rewrite_instructions: directivesToInstructions(d),
    rewritten: null,
    note: "Pass this payload to an LLM with rewrite_instructions as the system prompt. Instructions are derived from the user's receiver profile, not a fixed style.",
  };
}

export {
  interpret,
  interpretWithModel,
  normalizeText as normalize,
  splitText as split,
  rewriteText as rewrite,
  routeTask as route,
  scoreCandidates as score,
  resolveAmbiguity,
  rewriteForProfile,
  directivesToInstructions,
};
export type {
  TranslationOutput,
  InterpretModelOptions,
  NormalizeResult,
  SplitResult,
  RewriteResult,
  RouteResult,
  ScoreResult,
  HatpFactors,
  RiskCategory,
  ARLevel,
  RecoveredEntity,
  EntityCandidate,
  RecoveredIntent,
};
