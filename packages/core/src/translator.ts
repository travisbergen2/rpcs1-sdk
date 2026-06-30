// ── RPCS-1 Translator — native TypeScript implementation ───────────
// Ported from sdk/python/src/rpcs1/translator/
// No Python dependency. Runs in any Node.js environment.

type RiskCategory = 'casual' | 'advice' | 'high-stakes' | 'safety-critical';
type ARLevel = 'AR0' | 'AR1' | 'AR2' | 'AR3' | 'AR4' | 'AR5';

const RISK_THRESHOLDS: Record<RiskCategory, number> = {
  casual: 0.15,
  advice: 0.30,
  'high-stakes': 0.60,
  'safety-critical': 0.85,
};

const REFERENCE_WEIGHTS = { IC: 0.30, UE: 0.25, EC: 0.15, NM: 0.10, SG: 0.10, TI: 0.10 };

// ── Types ───────────────────────────────────────────────────────────

interface CandidateInput {
  label: string;
  IC: number;
  UE: number;
  EC: number;
  NM: number;
  SG: number;
  TI: number;
  ti_penalty_multiplier?: number;
}

interface Candidate extends CandidateInput {
  ti_penalty_multiplier: number;
  score: number;
}

/** A single candidate resolution for an ambiguous reference */
interface EntityCandidate {
  text: string;
  confidence: number;
}

/** A recovered ambiguous entity with its top candidate and alternatives */
interface RecoveredEntity {
  original: string;
  category: 'pronoun' | 'location' | 'time' | 'action' | 'unspecified';
  candidate: EntityCandidate;
  alternatives: EntityCandidate[];
}

/** Recovered intent classification */
interface RecoveredIntent {
  type: 'question' | 'correction' | 'explanation' | 'planning' | 'opinion' | 'instruction' | 'emotional_support' | 'research' | 'general';
  confidence: number;
}

/** Full pipeline output */
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

function computeScore(c: CandidateInput): number {
  const w = REFERENCE_WEIGHTS;
  const penaltyTI = (1 - c.TI) * (c.ti_penalty_multiplier ?? 1.0);
  return w.IC * c.IC + w.UE * c.UE + w.EC * c.EC + w.NM * c.NM - w.SG * c.SG - w.TI * penaltyTI;
}

function resolveAmbiguity(
  candidatesInput: CandidateInput[],
  risk: RiskCategory = 'advice',
): ScoreResult {
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

  return {
    candidates,
    scores,
    margin,
    risk_category: risk,
    threshold,
    should_collapse: shouldCollapse,
    ar_level: arLevel,
    winner,
  };
}

// ── Ambiguity patterns ─────────────────────────────────────────────



// ── Translation Pipeline ───────────────────────────────────────

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
        defaultCandidates.push(
          { text: '[unknown group]', confidence: 0.50 },
          { text: '[the people being discussed]', confidence: 0.35 },
        );
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
  { type: 'question', patterns: [/^what\\b/i, /^where\\b/i, /^when\\b/i, /^why\\b/i, /^how\\b/i, /^who\\b/i, /^which\\b/i, /\\?$/] },
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
    for (const p of patterns) {
      if (p.test(text)) return { type, confidence: 0.85 };
    }
  }
  if (/\\?$/.test(text.trim())) return { type: 'question', confidence: 0.70 };
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

function interpret(text: string, risk: RiskCategory = 'advice'): TranslationOutput {
  // Stage 1: Entity Recovery
  const { entities, hasAmbiguity } = recoverEntities(text);
  // Stage 2: Intent Recovery
  const intent = recoverIntent(text);
  // Stage 3: Canonical Translation
  const canonical = buildCanonicalTranslation(text, entities);

  // Stage 4: Risk Evaluation
  const lower = text.toLowerCase().trim();
  const vagueCount = VAGUE_SIGNALS.filter((s) => lower.includes(s)).length;
  const totalSignals = (hasAmbiguity ? 1 : 0) + vagueCount;
  const ambiguitySeverity = Math.min(1.0, totalSignals / 4);

  const dynamicCandidates: CandidateInput[] = [];
  if (!hasAmbiguity && vagueCount === 0) {
    dynamicCandidates.push({ label: 'literal', IC: 0.85, UE: 0.80, EC: 0.80, NM: 0.70, SG: 0.10, TI: 1.00 });
  } else {
    const literalIC = Math.max(0.3, 0.8 - ambiguitySeverity * 0.5);
    dynamicCandidates.push({ label: 'literal', IC: literalIC, UE: 0.70, EC: 0.60, NM: 0.60, SG: 0.20, TI: 0.95 });
    if (hasAmbiguity) {
      dynamicCandidates.push({ label: 'ambiguous_reference', IC: 0.30, UE: 0.40, EC: 0.50, NM: 0.60, SG: 0.75, TI: 0.55, ti_penalty_multiplier: 1.5 });
    }
    if (vagueCount > 0) {
      dynamicCandidates.push({ label: 'underspecified', IC: 0.35, UE: 0.40, EC: 0.50, NM: 0.60, SG: 0.70, TI: 0.60, ti_penalty_multiplier: 1.5 });
    }
  }
  if (dynamicCandidates.length === 1) {
    dynamicCandidates.push({ label: 'alt', IC: dynamicCandidates[0].IC - 0.2, UE: dynamicCandidates[0].UE - 0.1, EC: dynamicCandidates[0].EC - 0.1, NM: dynamicCandidates[0].NM, SG: dynamicCandidates[0].SG + 0.1, TI: dynamicCandidates[0].TI - 0.1 });
  }

  const effectiveRisk = ambiguitySeverity > 0.3 && risk === 'casual' ? 'advice' : risk;
  const resolution = resolveAmbiguity(dynamicCandidates, effectiveRisk);
  const ti = resolution.candidates[0]?.TI ?? 0.5;

  const playbackRequired = ti < 0.95 || (risk === 'safety-critical' && hasAmbiguity);
  const questions: string[] = [];
  if (hasAmbiguity) {
    for (const entity of entities) {
      questions.push('What does "' + entity.original + '" refer to?');
    }
  }
  if (risk === 'safety-critical' || risk === 'high-stakes') {
    if (questions.length === 0) questions.push('I want to verify — is this exactly what you mean?');
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

function normalizeText(text: string): NormalizeResult {
  const fragments = text
    .replace(/\.\.\./g, '\x00')
    .replace(/\.\./g, '\x00')
    .split('\x00')
    .map((f) => f.trim())
    .filter(Boolean);
  return {
    original: text,
    fragments,
    normalized: fragments.length ? fragments.join(' ') : text,
    fragment_count: fragments.length || 1,
  };
}

// ── split ──────────────────────────────────────────────────────────

const REWRITE_STYLES: Record<string, { label: string; description: string; instructions: string }> = {
  technical: {
    label: 'Technical',
    description: 'Preserve exact language and precision',
    instructions:
      'Use precise terminology. Maintain all technical details. Prefer passive voice where appropriate.',
  },
  plain: {
    label: 'Plain',
    description: 'Clear but not condescending',
    instructions: 'Use simple, clear language. Avoid jargon. Be direct but friendly.',
  },
  socially_gentle: {
    label: 'Socially Gentle',
    description: 'Soften tone to reduce confrontation',
    instructions:
      "Use softer framing. Replace accusations with observations. Add buffers like 'I think' and 'maybe'.",
  },
  concise: {
    label: 'Concise',
    description: 'Shortest useful form',
    instructions: 'Cut all unnecessary words. Use bullet points. Remove pleasantries.',
  },
  detailed: {
    label: 'Detailed',
    description: 'Expanded with context and assumptions',
    instructions:
      'Add context, explain reasoning, state assumptions. Include caveats and edge cases.',
  },
  direct: {
    label: 'Direct',
    description: 'Remove hedging, keep truth',
    instructions: 'Remove qualifying language. Be straightforward. State the truth without softening.',
  },
};

function rewriteText(text: string, style: string = 'plain'): RewriteResult {
  const info = REWRITE_STYLES[style];
  if (!info) {
    return {
      original: text,
      style,
      style_label: 'Unknown',
      style_description: '',
      rewrite_instructions: `Unknown style "${style}". Available: ${Object.keys(REWRITE_STYLES).join(', ')}`,
      rewritten: null,
      note: 'Invalid style requested.',
    };
  }
  return {
    original: text,
    style,
    style_label: info.label,
    style_description: info.description,
    rewrite_instructions: info.instructions,
    rewritten: null,
    note: 'Pass this payload to an LLM with the rewrite_instructions as the system prompt.',
  };
}



export { interpret, normalizeText as normalize, rewriteText as rewrite };
export type { TranslationOutput, RecoveredEntity, EntityCandidate, RecoveredIntent };
