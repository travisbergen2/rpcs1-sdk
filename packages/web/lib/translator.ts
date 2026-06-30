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

interface InterpretResult {
  literal_summary: string;
  implied_meaning: string | null;
  ambiguities: string[];
  confidence: number;
  suggested_next_step: string;
  clean_prompt: string;
  clarifying_questions: string[];
  ar_level: ARLevel;
  candidates: Candidate[];
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

// ── Ambiguity patterns ─────────────────────────────────────────────

const AMBIGUITY_PATTERNS: Record<string, CandidateInput[]> = {
  "i'm fine": [
    { label: 'neutral', IC: 0.80, UE: 0.20, EC: 0.50, NM: 0.50, SG: 0.10, TI: 1.00 },
    { label: 'frustrated', IC: 0.40, UE: 0.90, EC: 0.50, NM: 0.50, SG: 0.70, TI: 0.90 },
  ],
  "i don't know": [
    { label: 'uncertain', IC: 0.85, UE: 0.30, EC: 0.20, NM: 0.50, SG: 0.10, TI: 1.00 },
    { label: 'avoiding_answer', IC: 0.20, UE: 0.70, EC: 0.60, NM: 0.50, SG: 0.60, TI: 0.80 },
    { label: 'thinking', IC: 0.40, UE: 0.50, EC: 0.30, NM: 0.70, SG: 0.40, TI: 0.90 },
  ],
  'whatever you think': [
    { label: 'deferring', IC: 0.70, UE: 0.30, EC: 0.30, NM: 0.50, SG: 0.20, TI: 1.00 },
    { label: 'apathetic', IC: 0.30, UE: 0.60, EC: 0.80, NM: 0.50, SG: 0.60, TI: 0.90 },
  ],
  "it's nothing": [
    { label: 'literal', IC: 0.75, UE: 0.20, EC: 0.40, NM: 0.50, SG: 0.10, TI: 1.00 },
    { label: 'dismissive', IC: 0.30, UE: 0.70, EC: 0.70, NM: 0.50, SG: 0.60, TI: 0.85 },
  ],
};

// ── interpret ──────────────────────────────────────────────────────

function interpret(text: string, risk: RiskCategory = 'advice'): InterpretResult {
  const result: InterpretResult = {
    literal_summary: text,
    implied_meaning: null,
    ambiguities: [],
    confidence: 0,
    suggested_next_step: 'proceed',
    clean_prompt: text,
    clarifying_questions: [],
    ar_level: 'AR0',
    candidates: [],
    margin: 0,
  };

  const lower = text.toLowerCase().trim();
  for (const [pattern, candidatesData] of Object.entries(AMBIGUITY_PATTERNS)) {
    if (lower.includes(pattern)) {
      const resolution = resolveAmbiguity(candidatesData, risk);
      result.candidates = resolution.candidates;
      result.margin = resolution.margin;
      result.ar_level = resolution.ar_level;
      result.confidence = resolution.scores[0] ?? 0;

      if (resolution.should_collapse && resolution.winner) {
        result.implied_meaning = `Most likely: ${resolution.winner}`;
        result.suggested_next_step = 'proceed_with_awareness';
      } else {
        const labels = resolution.candidates.map((c) => c.label);
        result.ambiguities = [`Could be interpreted as: ${labels.join(', ')}`];
        result.suggested_next_step = 'clarify';
        result.clarifying_questions = [
          `I see multiple possibilities (${labels.join(', ')}). Can you clarify which one you meant?`,
        ];
      }
      return result;
    }
  }

  // ── Dynamic ambiguity detection (no hardcoded pattern matched) ──
  // Analyze the actual text for vague/ambiguous language and generate candidates dynamically.
  const lower2 = text.toLowerCase().trim();
  const words = text.split(/\s+/).filter(Boolean);

  // Vague/ambiguous language signals
  const vagueWords = ['thing', 'stuff', 'something', 'somehow', 'somewhere', 'someone', 'somebody',
    'whatever', 'anyway', 'anything', 'anywhere', 'anyone', 'whoever', 'whichever',
    'kind of', 'sort of', 'type of', 'a bit', 'a little', 'more or less',
    'maybe', 'perhaps', 'possibly', 'probably', 'might', 'could be',
    'seems', 'appears', 'feels like', 'looks like', 'sounds like',
    'that thing', 'that stuff', 'the one', 'the thing', 'that place', 'over there',
    'you know', 'if you know what i mean', 'etc', 'whatever you think',
  ];
  const contextMissingWords = ['it', 'this', 'that', 'there', 'here', 'they', 'them'];
  const ambiguityWords = ['or', 'maybe', 'either', 'versus', 'vs', 'rather than'];
  const preferenceWords = ['like', 'want', 'prefer', 'think', 'feel', 'guess', 'suppose',
    'would', 'could', 'might', 'whichever', 'either way'];
  const locationWords = ['where', 'find', 'locate', 'search', 'look for', 'looking for',
    'where is', 'where are', 'where can i', 'where do i'];

  // Count signals
  const vagueCount = vagueWords.filter(function(w) { return lower2.includes(w); }).length;
  const contextMissingCount = contextMissingWords.filter(function(w) {
    var regex = new RegExp("\\b" + w + "\\b", 'i');
    return regex.test(lower2);
  }).length;
  const hasAmbiguityWords = ambiguityWords.some(function(w) { return lower2.includes(w); });
  const hasPreferenceSignal = preferenceWords.some(function(w) { return lower2.includes(w); });
  const hasLocationSignal = locationWords.some(function(w) { return lower2.includes(w); });
  const isQuestion = lower2.includes('?') || /^(what|where|when|why|how|who|which|whose|whom)\b/i.test(text.trim());

  // Build ambiguity list
  const ambiguities2 = [];
  if (vagueCount > 0) ambiguities2.push('vague_reference');
  if (contextMissingCount >= 2) ambiguities2.push('missing_context');
  if (hasAmbiguityWords) ambiguities2.push('disjunctive_intent');
  if (hasPreferenceSignal) ambiguities2.push('unexpressed_preference');
  if (isQuestion && (vagueCount > 0 || contextMissingCount >= 1)) ambiguities2.push('underspecified_query');
  if (hasLocationSignal) ambiguities2.push('location_ambiguous');
  if (words.length <= 3) ambiguities2.push('underspecified');

  // Calculate ambiguity severity (0..1)
  const totalSignals = vagueCount + contextMissingCount + (hasAmbiguityWords ? 1 : 0) +
    (hasPreferenceSignal ? 1 : 0) + (hasLocationSignal ? 1 : 0) + (isQuestion ? 1 : 0);
  const ambiguitySeverity = Math.min(1.0, totalSignals / 6);

  // Build dynamic candidates
  const dynamicCandidates = [];
  if (ambiguitySeverity < 0.4 && totalSignals === 0) {
    // Low ambiguity — literal interpretation likely correct
    dynamicCandidates.push({ label: 'literal', IC: 0.85, UE: 0.80, EC: 0.80, NM: 0.70, SG: 0.10, TI: 1.00 });
  } else {
    // Literal interpretation
    const literalIC = Math.max(0.3, 0.8 - ambiguitySeverity * 0.5);
    dynamicCandidates.push({ label: 'literal', IC: literalIC, UE: 0.70, EC: 0.60, NM: 0.60, SG: 0.20, TI: 0.95 });

    // Vague — user might be unsure or underspecifying
    if (vagueCount > 0) {
      dynamicCandidates.push({ label: 'underspecified', IC: 0.35, UE: 0.40, EC: 0.50, NM: 0.60, SG: 0.70, TI: 0.60, ti_penalty_multiplier: 1.5 });
    }

    // Requesting guidance/preference
    if (hasPreferenceSignal || isQuestion) {
      dynamicCandidates.push({ label: 'seeking_guidance', IC: 0.30, UE: 0.50, EC: 0.30, NM: 0.70, SG: 0.60, TI: 0.70 });
    }

    // Missing context — implied referent
    if (contextMissingCount >= 1 || hasLocationSignal) {
      dynamicCandidates.push({ label: 'implied_referent', IC: 0.25, UE: 0.30, EC: 0.40, NM: 0.60, SG: 0.80, TI: 0.50, ti_penalty_multiplier: 2.0 });
    }
  }

  // Ensure we always have at least 2 candidates to enable ambiguity scoring
  if (dynamicCandidates.length === 1) {
    dynamicCandidates.push({ label: 'literal_alt', IC: dynamicCandidates[0].IC - 0.2, UE: dynamicCandidates[0].UE - 0.1, EC: dynamicCandidates[0].EC - 0.1, NM: dynamicCandidates[0].NM, SG: dynamicCandidates[0].SG + 0.1, TI: dynamicCandidates[0].TI - 0.1 });
  }

  // Risk-adjusted threshold: at higher risk, we're more sensitive to ambiguity
  const effectiveRisk = ambiguitySeverity > 0.3 && risk === 'casual' ? 'advice' : risk;

  const resolution2 = resolveAmbiguity(dynamicCandidates, effectiveRisk);

  // Generate clarifying questions based on detected ambiguities
  const clarifyingQuestions2 = [];
  if (ambiguities2.includes('vague_reference')) {
    clarifyingQuestions2.push('You mentioned something vague. Can you be more specific about what you’re referring to?');
  }
  if (ambiguities2.includes('missing_context')) {
    clarifyingQuestions2.push('Can you provide more context about what you’re referring to?');
  }
  if (ambiguities2.includes('underspecified_query') || ambiguities2.includes('location_ambiguous')) {
    clarifyingQuestions2.push('What specific information are you looking for?');
  }
  if (ambiguities2.includes('unexpressed_preference')) {
    clarifyingQuestions2.push('Do you have a preference, or would you like a recommendation?');
  }
  if (ambiguities2.includes('underspecified')) {
    clarifyingQuestions2.push('Can you elaborate on what you need?');
  }
  // At higher risk levels, always add a verification question
  if (risk === 'safety-critical' || risk === 'high-stakes') {
    if (!clarifyingQuestions2.length) {
      clarifyingQuestions2.push('I want to verify — is this exactly what you mean, or should I ask clarifying questions first?');
    }
    // Make the threshold stricter for safety-critical
    if (risk === 'safety-critical' && ambiguities2.length === 0 && !isQuestion) {
      clarifyingQuestions2.push('Given the safety-critical context, should I proceed or ask more questions first?');
    }
  }

  // Determine suggested next step
  var suggestedNextStep2;
  if (resolution2.ar_level === 'AR0' || resolution2.ar_level === 'AR1') {
    suggestedNextStep2 = 'proceed_with_awareness';
  } else if (resolution2.ar_level === 'AR4' || resolution2.ar_level === 'AR5') {
    suggestedNextStep2 = 'clarify';
  } else {
    suggestedNextStep2 = ambiguities2.length > 0 ? 'clarify' : 'proceed';
  }

  // If we're at safety-critical and ANY ambiguity exists, refuse to collapse
  if (risk === 'safety-critical' && ambiguities2.length > 0) {
    suggestedNextStep2 = 'refuse';
  }

  result.literal_summary = text;
  result.ambiguities = ambiguities2;
  result.confidence = Math.round((resolution2.candidates[0]?.score ?? 0.5) * 100) / 100;
  result.suggested_next_step = suggestedNextStep2;
  result.clean_prompt = text;
  result.clarifying_questions = clarifyingQuestions2;
  result.ar_level = resolution2.ar_level;
  result.candidates = resolution2.candidates;
  result.margin = resolution2.margin;

  if (resolution2.should_collapse && resolution2.winner) {
    result.implied_meaning = 'Most likely: ' + resolution2.winner;
  } else {
    var labels2 = resolution2.candidates.map(function(c) { return c.label; });
    result.implied_meaning = 'Could be: ' + labels2.join(', ');
    if (!result.clarifying_questions.length) {
      result.clarifying_questions = [
        'I see multiple possibilities (' + labels2.join(', ') + '). Can you clarify which one you meant?',
      ];
    }
  }

  return result;
}

// ── normalize ──────────────────────────────────────────────────────

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
export type { InterpretResult, NormalizeResult, SplitResult, RewriteResult, RouteResult, ScoreResult, CandidateInput, RiskCategory };

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
  const recommendedPosture = recommendPosture(resolution.ar_level, riskCat);
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

function recommendPosture(arLevel: ARLevel, riskCat: string): { label: string; description: string; settings: { temperature: number; top_p: number } } {
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
