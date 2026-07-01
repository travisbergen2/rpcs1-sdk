// ── RPCS-1 Translator (web) — thin shim over the canonical @rpcs1/core engine ──
//
// The translation engine now lives in @rpcs1/core (single source of truth). This
// file re-exports it unchanged so existing imports (`@/lib/translator`) keep
// working, and keeps ONLY the web-specific diagnostic-report generator below.
//
// NOTE: the diagnostic uses the HF-HATP factor set (interpConf/userEvid/epistemic/
// narrative/semGap/transInteg) — distinct from the RPCS-1 receiver primitives.

export {
  interpret,
  normalize,
  split,
  rewrite,
  route,
  score,
  resolveAmbiguity,
  rewriteForProfile,
  directivesToInstructions,
} from '@rpcs1/core';
export type {
  TranslationOutput,
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
} from '@rpcs1/core';

import { resolveAmbiguity } from '@rpcs1/core';
import type { ScoreResult, ARLevel, RiskCategory } from '@rpcs1/core';

// ── Diagnostic Report Generator (web-specific) ──────────────────────

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
  // Report display labels use the HF-HATP protocol abbreviations (IC/UE/EC/NM/SG/TI).
  primitives: { IC: number; UE: number; EC: number; NM: number; SG: number; TI: number };
  recommendations: {
    should_collapse: boolean;
    posture: { label: string; description: string; settings: { temperature: number; top_p: number } };
    next_tests: string[];
  };
  raw_analysis: ScoreResult;
}

function generateDiagnosticReport(brief: DiagnosticBrief): DiagnosticReport {
  const agentType = brief.agent_type || 'support copilot';
  const textLower = `${brief.biggest_risk || ''} ${brief.desired_outcome || ''}`.toLowerCase();

  const riskKeywords: Record<string, string[]> = {
    high: ['catastrophic', 'critical', 'safety', 'death', 'injury', 'legal', 'compliance', 'financial', 'revenue', 'customer', 'production', 'live'],
    medium: ['error', 'mistake', 'bug', 'fail', 'confusion', 'wrong', 'miss'],
    low: ['minor', 'cosmetic', 'nice to have', 'preference'],
  };
  const highScore = riskKeywords.high.filter((k) => textLower.includes(k)).length;
  const medScore = riskKeywords.medium.filter((k) => textLower.includes(k)).length;

  let stakes: string;
  let riskCat: RiskCategory;
  if (highScore >= 3) { stakes = 'high'; riskCat = 'high-stakes'; }
  else if (highScore >= 1 || medScore >= 3) { stakes = 'medium'; riskCat = 'advice'; }
  else { stakes = 'low'; riskCat = 'casual'; }

  const confidentWords = ['confident', 'certain', 'sure', 'know', 'definitely', 'clearly'];
  const uncertainWords = ['maybe', 'perhaps', 'possibly', 'not sure', 'uncertain', 'guess'];
  let confidence = 0.5;
  for (const w of confidentWords) if (textLower.includes(w)) confidence = Math.min(1.0, confidence + 0.15);
  for (const w of uncertainWords) if (textLower.includes(w)) confidence = Math.max(0.0, confidence - 0.1);

  const vagueWords = ['thing', 'stuff', 'something', 'somehow', 'somewhere', 'kind of', 'sort of'];
  const semanticGap = Math.min(0.8, 0.1 + vagueWords.filter((w) => textLower.includes(w)).length * 0.15);
  const detailMarkers = ['example', 'specific', 'concrete', 'scenario', 'when', 'exactly'];
  const userEvidence = Math.min(0.9, 0.2 + detailMarkers.filter((w) => textLower.includes(w)).length * 0.15);

  const ic = confidence, ue = userEvidence, ec = confidence, nm = 0.6, sg = semanticGap;
  const ti = stakes === 'high' || stakes === 'medium' ? 0.85 : 0.70;

  // HF-HATP candidate factors (note the disambiguated field names from core).
  const candidates = [
    { label: 'Recommended Config', interpConf: ic, userEvid: ue, epistemic: ec, narrative: nm, semGap: sg, transInteg: ti },
    { label: 'Conservative Config', interpConf: Math.max(0.1, ic - 0.3), userEvid: ue, epistemic: ec, narrative: nm, semGap: sg, transInteg: Math.min(1.0, ti + 0.15) },
  ];
  const resolution = resolveAmbiguity(candidates, riskCat);

  return {
    report_id: `diag-${Math.floor(Date.now() / 1000)}`,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    summary: {
      agent_type: agentType,
      stakes_assessment: stakes,
      risk_category: riskCat,
      stability_regime: classifyRegime(resolution.margin, stakes, ic),
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
      posture: recommendPosture(resolution.ar_level),
      next_tests: suggestNextTests(resolution, riskCat, agentType),
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
  if (resolution.ar_level === 'AR4' || resolution.ar_level === 'AR5') tests.push(`Run 3 ambiguous ${agentType} scenarios to test clarification behavior`);
  if (riskCat === 'high-stakes' || riskCat === 'safety-critical') tests.push('Verify safety constraints on a test set before production');
  else if (riskCat === 'advice') tests.push('A/B test recommended settings against current configuration');
  tests.push('Rerun the diagnostic after implementing changes to confirm improvement');
  return tests;
}

export { generateDiagnosticReport };
export type { DiagnosticBrief, DiagnosticReport };
