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

// ── Translation Pipeline Types ─────────────────────────────────

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

// ── Scoring engine ──────────────────────────────────────────────────

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



// ── Translation Pipeline ───────────────────────────────────────

// ── Stage 1: Entity Recovery ───────────────────────────────────

/** Known pronouns and ambiguous references for entity recovery */
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

/** Vague / underspecified language signals */
const VAGUE_SIGNALS = [
  'thing', 'stuff', 'somehow', 'kind of', 'sort of', 'type of',
  'whatever', 'anyway', 'anything', 'anywhere', 'anyone',
  'you know', 'etc', 'whatever you think',
];

function recoverEntities(text: string, contextHint?: string): { entities: RecoveredEntity[]; hasAmbiguity: boolean } {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const entities: RecoveredEntity[] = [];
  let hasAmbiguity = false;

  const seen = new Set<string>();

  for (const ref of AMBIGUOUS_REFERENCES) {
    // Use word boundary detection
    const regex = new RegExp('\\b' + ref.word + '\\b', 'i');
    if (regex.test(lower) && !seen.has(ref.word)) {
      seen.add(ref.word);
      hasAmbiguity = true;

      // Generate plausible candidates based on context
      const defaultCandidates: EntityCandidate[] = [];

      if (ref.word === 'they' || ref.word === 'them' || ref.word === 'their') {
        defaultCandidates.push(
          { text: '[unknown group]', confidence: 0.50 },
          { text: '[the people being discussed]', confidence: 0.35 },
        );
      } else if (ref.word === 'he' || ref.word === 'him') {
        defaultCandidates.push(
          { text: '[unknown male]', confidence: 0.50 },
        );
      } else if (ref.word === 'she' || ref.word === 'her') {
        defaultCandidates.push(
          { text: '[unknown female]', confidence: 0.50 },
        );
      } else if (ref.word === 'it' || ref.word === 'its') {
        defaultCandidates.push(
          { text: '[unknown object/topic]', confidence: 0.50 },
        );
      } else if (ref.word === 'there' || ref.word === 'somewhere') {
        defaultCandidates.push(
          { text: '[unknown location]', confidence: 0.50 },
        );
      } else if (ref.word === 'that' || ref.word === 'those' || ref.word === 'this' || ref.word === 'these') {
        defaultCandidates.push(
          { text: '[unspecified referent]', confidence: 0.50 },
        );
      } else if (ref.word === 'someone' || ref.word === 'somebody') {
        defaultCandidates.push(
          { text: '[unknown person]', confidence: 0.50 },
        );
      } else if (ref.word === 'something') {
        defaultCandidates.push(
          { text: '[unspecified thing]', confidence: 0.50 },
        );
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

// ── Stage 2: Intent Recovery ───────────────────────────────────

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
    for (const p of patterns) {
      if (p.test(text)) {
        return { type, confidence: 0.85 };
      }
    }
  }
  if (/\?$/.test(text.trim())) return { type: 'question', confidence: 0.70 };
  return { type: 'general', confidence: 0.60 };
}

// ── Stage 3: Canonical Translation ─────────────────────────────

function buildCanonicalTranslation(text: string, entities: RecoveredEntity[]): string {
  if (entities.length === 0) return text;
  let translated = text;
  // Replace each entity with its best candidate (bracketed placeholder)
  for (const entity of entities) {
    const regex = new RegExp('\\b' + entity.original + '\\b', 'gi');
    translated = translated.replace(regex, entity.candidate.text);
  }
  return translated;
}

// ── Stage 4-6: combined interpret pipeline ────────────────────

function interpret(text: string, risk: RiskCategory = 'advice', contextHint?: string): TranslationOutput {
  // Stage 1: Entity Recovery
  const { entities, hasAmbiguity } = recoverEntities(text, contextHint);

  // Stage 2: Intent Recovery
  const intent = recoverIntent(text);

  // Stage 3: Canonical Translation
  const canonical = buildCanonicalTranslation(text, entities);

  // Stage 4: Risk Evaluation (integrated with existing scoring)
  // Detect vagueness signals
  const lower = text.toLowerCase().trim();
  const vagueCount = VAGUE_SIGNALS.filter((s) => lower.includes(s)).length;
  const totalSignals = (hasAmbiguity ? 1 : 0) + vagueCount;
  const ambiguitySeverity = Math.min(1.0, totalSignals / 4);

  // Build candidates for scoring
  const dynamicCandidates: CandidateInput[] = [];
  if (!hasAmbiguity && vagueCount === 0) {
    // Low ambiguity — literal interpretation
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

  // Ensure we have at least 2 candidates
  if (dynamicCandidates.length === 1) {
    dynamicCandidates.push({ label: 'alt', IC: dynamicCandidates[0].IC - 0.2, UE: dynamicCandidates[0].UE - 0.1, EC: dynamicCandidates[0].EC - 0.1, NM: dynamicCandidates[0].NM, SG: dynamicCandidates[0].SG + 0.1, TI: dynamicCandidates[0].TI - 0.1 });
  }

  const effectiveRisk = ambiguitySeverity > 0.3 && risk === 'casual' ? 'advice' : risk;
  const resolution = resolveAmbiguity(dynamicCandidates, effectiveRisk);
  const ti = resolution.candidates[0]?.TI ?? 0.5;

  // Stage 5: Playback Decision
  const playbackRequired = ti < 0.95 || (risk === 'safety-critical' && hasAmbiguity);

  // Stage 6: Clarifying questions
  const questions: string[] = [];
  if (hasAmbiguity) {
    for (const entity of entities) {
      questions.push(`What does "${entity.original}" refer to?`);
    }
  }
  if (risk === 'safety-critical' || risk === 'high-stakes') {
    if (questions.length === 0) {
      questions.push('I want to verify — is this exactly what you mean?');
    }
  }

  // Build candidate display list
  const displayCandidates = entities.map((e) => e.candidate);
  if (displayCandidates.length === 0 && resolution.candidates.length > 0) {
    displayCandidates.push({ text: resolution.candidates[0].label, confidence: resolution.candidates[0].score });
  }

  const integrityPct = Math.round(ti * 100);
  const confidence = Math.round((resolution.candidates[0]?.score ?? 0.5) * 100) / 100;

  return {
    original: text,
    recovered_entities: entities,
    recovered_intent: intent,
    canonical_translation: canonical,
    translation_integrity: integrityPct,
    confidence,
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

function splitText(text: string): SplitResult {
  const parts = text
    .split(/(?:and\s+also|but\s+also|and|but|\.\s*|;\s*)/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { original: text, intents: parts, count: parts.length };
}

// ── rewrite ────────────────────────────────────────────────────────

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

// ── route ──────────────────────────────────────────────────────────

const TASK_ROUTES: Record<string, { description: string; recommended: string; fallback: string; risk: string }> = {
  code: {
    description: 'Code generation, debugging, refactoring',
    recommended: 'reasoning',
    fallback: 'fast',
    risk: 'high-stakes',
  },
  creative_writing: {
    description: 'Creative prose, storytelling, marketing copy',
    recommended: 'creative',
    fallback: 'balanced',
    risk: 'casual',
  },
  analysis: {
    description: 'Data analysis, research, summarization',
    recommended: 'reasoning',
    fallback: 'balanced',
    risk: 'advice',
  },
  chat: {
    description: 'General conversation, Q&A, assistance',
    recommended: 'balanced',
    fallback: 'fast',
    risk: 'casual',
  },
  translation: {
    description: 'Language translation, localization',
    recommended: 'balanced',
    fallback: 'fast',
    risk: 'advice',
  },
  reasoning: {
    description: 'Complex reasoning, math, logic puzzles',
    recommended: 'reasoning',
    fallback: 'balanced',
    risk: 'advice',
  },
  planning: {
    description: 'Project planning, task decomposition, scheduling',
    recommended: 'reasoning',
    fallback: 'balanced',
    risk: 'advice',
  },
  emotional: {
    description: 'Emotional support, empathy, venting',
    recommended: 'creative',
    fallback: 'balanced',
    risk: 'casual',
  },
};

function routeTask(taskType: string, objective?: string, allowMultiModel = false): RouteResult {
  const info = TASK_ROUTES[taskType];
  if (!info) {
    return {
      task_type: taskType,
      description: '',
      primary_route: '',
      fallback_route: '',
      risk_category: '',
      target_audience: 'plain',
      strategy: '',
      objective,
    };
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

// ── score ──────────────────────────────────────────────────────────

function scoreCandidates(candidatesInput: CandidateInput[], risk: RiskCategory = 'casual'): ScoreResult {
  return resolveAmbiguity(candidatesInput, risk);
}

// ── Exports ────────────────────────────────────────────────────────

export {
  interpret,
  normalizeText as normalize,
  splitText as split,
  rewriteText as rewrite,
  routeTask as route,
  scoreCandidates as score,
  resolveAmbiguity,
};
export type { TranslationOutput, NormalizeResult, SplitResult, RewriteResult, RouteResult, ScoreResult, CandidateInput, RiskCategory, RecoveredEntity, EntityCandidate, RecoveredIntent };

// ── Diagnostic Report Generator ────────────────────────────────────

interface DiagnosticBrief {
  name?: string;
  email?: string;
  company?: string;
  agent_type?: string;
  biggest_risk?: string;
  desired_outcome?: string;
  notes?: string;
  stage?: string;
}

interface DiagnosticReport {
  report_id: string;
  generated_at: string;
  summary: {
    agent_type: string;
    stakes_assessment: string;
    risk_category: string;
    stability_regime: string;
    confidence_score: number;
    ambiguity_margin: number;
    ar_level: ARLevel;
  };
  primitives: {
    IC: number;
    UE: number;
    EC: number;
    NM: number;
    SG: number;
    TI: number;
  };
  recommendations: {
    should_collapse: boolean;
    posture: { label: string; description: string; settings: { temperature: number; top_p: number } };
    next_tests: string[];
  };
  raw_analysis: ScoreResult;
}

function generateDiagnosticReport(brief: DiagnosticBrief): DiagnosticReport {
  const agentType = brief.agent_type || 'support copilot';
  const biggestRisk = brief.biggest_risk || '';
  const desiredOutcome = brief.desired_outcome || '';

  const textLower = `${biggestRisk} ${desiredOutcome}`.toLowerCase();

  // Assess stakes via keyword matching
  const riskKeywords: Record<string, string[]> = {
    high: ['catastrophic', 'critical', 'safety', 'death', 'injury', 'legal', 'compliance',
           'financial', 'revenue', 'customer', 'production', 'live'],
    medium: ['error', 'mistake', 'bug', 'fail', 'confusion', 'wrong', 'miss'],
    low: ['minor', 'cosmetic', 'nice to have', 'preference'],
  };

  const highScore = riskKeywords.high.filter((k) => textLower.includes(k)).length;
  const medScore = riskKeywords.medium.filter((k) => textLower.includes(k)).length;

  let stakes: string;
  let riskCat: RiskCategory;
  if (highScore >= 3) {
    stakes = 'high';
    riskCat = 'high-stakes';
  } else if (highScore >= 1 || medScore >= 3) {
    stakes = 'medium';
    riskCat = 'advice';
  } else {
    stakes = 'low';
    riskCat = 'casual';
  }

  // Confidence from word cues
  const confidentWords = ['confident', 'certain', 'sure', 'know', 'definitely', 'clearly'];
  const uncertainWords = ['maybe', 'perhaps', 'possibly', 'not sure', 'uncertain', 'guess'];
  let confidence = 0.5;
  for (const w of confidentWords) if (textLower.includes(w)) confidence = Math.min(1.0, confidence + 0.15);
  for (const w of uncertainWords) if (textLower.includes(w)) confidence = Math.max(0.0, confidence - 0.1);

  // Semantic gap from vagueness
  const vagueWords = ['thing', 'stuff', 'something', 'somehow', 'somewhere', 'kind of', 'sort of'];
  const sgScore = vagueWords.filter((w) => textLower.includes(w)).length;
  const semanticGap = Math.min(0.8, 0.1 + sgScore * 0.15);

  // User evidence from detail markers
  const detailMarkers = ['example', 'specific', 'concrete', 'scenario', 'when', 'exactly'];
  const ueScore = detailMarkers.filter((w) => textLower.includes(w)).length;
  const userEvidence = Math.min(0.9, 0.2 + ueScore * 0.15);

  const tiBase = stakes === 'high' || stakes === 'medium' ? 0.85 : 0.70;
  const ic = confidence;
  const ue = userEvidence;
  const ec = confidence;
  const nm = 0.6;
  const sg = semanticGap;
  const ti = tiBase;

  const candidates = [
    { label: 'Recommended Config', IC: ic, UE: ue, EC: ec, NM: nm, SG: sg, TI: ti },
    { label: 'Conservative Config', IC: Math.max(0.1, ic - 0.3), UE: ue, EC: ec, NM: nm, SG: sg, TI: Math.min(1.0, ti + 0.15) },
  ];

  const resolution = resolveAmbiguity(candidates, riskCat);

  const regime = classifyRegime(resolution.margin, stakes, ic);
  const recommendedPosture = recommendPosture(resolution.ar_level);
  const nextTests = suggestNextTests(resolution, riskCat, agentType);

  return {
    report_id: `diag-${Math.floor(Date.now() / 1000)}`,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    summary: {
      agent_type: agentType,
      stakes_assessment: stakes,
      risk_category: riskCat,
      stability_regime: regime,
      confidence_score: Math.round(ic * 100) / 100,
      ambiguity_margin: Math.round(resolution.margin * 1000) / 1000,
      ar_level: resolution.ar_level,
    },
    primitives: {
      IC: Math.round(ic * 100) / 100,
      UE: Math.round(ue * 100) / 100,
      EC: Math.round(ec * 100) / 100,
      NM: Math.round(nm * 100) / 100,
      SG: Math.round(sg * 100) / 100,
      TI: Math.round(ti * 100) / 100,
    },
    recommendations: {
      should_collapse: resolution.should_collapse,
      posture: recommendedPosture,
      next_tests: nextTests,
    },
    raw_analysis: resolution,
  };
}

function classifyRegime(margin: number, stakes: string, confidence: number): string {
  if (margin < 0.05) return 'underdetermined';
  if (margin < 0.15) return stakes === 'high' || stakes === 'medium' ? 'oscillating' : 'stable';
  if (confidence > 0.7) return 'stable';
  if (margin > 0.5) return 'stable';
  return 'cautious';
}

function recommendPosture(arLevel: ARLevel): { label: string; description: string; settings: { temperature: number; top_p: number } } {
  const postures: Record<string, { label: string; description: string; settings: { temperature: number; top_p: number } }> = {
    AR0: { label: 'Direct', description: 'Execute immediately. Intent is clear and stakes are appropriate.', settings: { temperature: 0.3, top_p: 0.9 } },
    AR1: { label: 'Mirror', description: 'Execute with assumptions noted in playback.', settings: { temperature: 0.4, top_p: 0.85 } },
    AR4: { label: 'Clarify', description: 'Ask one specific question before proceeding.', settings: { temperature: 0.2, top_p: 0.8 } },
    AR5: { label: 'Refuse', description: 'Cannot collapse ambiguity. Needs human intervention.', settings: { temperature: 0.1, top_p: 0.7 } },
  };
  return postures[arLevel] || postures['AR4'];
}

function suggestNextTests(resolution: ScoreResult, riskCat: string, agentType: string): string[] {
  const tests: string[] = [];
  if (resolution.ar_level === 'AR4' || resolution.ar_level === 'AR5') {
    tests.push(`Run 3 ambiguous ${agentType} scenarios to test clarification behavior`);
  }
  if (riskCat === 'high-stakes' || riskCat === 'safety-critical') {
    tests.push('Verify safety constraints on a test set before production');
  } else if (riskCat === 'advice') {
    tests.push('A/B test recommended settings against current configuration');
  }
  tests.push('Rerun the diagnostic after implementing changes to confirm improvement');
  return tests;
}

export { generateDiagnosticReport };
export type { DiagnosticBrief, DiagnosticReport };
