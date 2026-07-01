/**
 * RPCS-1 Translator API.
 *
 * POST /api/translate
 * Body: { tool: "interpret"|"normalize"|"split"|"rewrite"|"route"|"score"|"intake", ...params }
 *
 * Consolidation: the profile-aware capabilities (intake, mirror, profile-tuned
 * rewrite/interpret) come from the shared @rpcs1/core package — the single source
 * of truth. Legacy split/route/score still come from the local lib until they are
 * ported into core (next consolidation step).
 */
import { NextResponse } from 'next/server';
// Legacy local translator (unchanged behavior; to be retired into core):
import { interpret, normalize, split, rewrite, route, score } from '@/lib/translator';
// Shared core — profile-aware translation + intake/mirror:
import {
  interpret as interpretProfiled,
  rewriteForProfile,
  scoreIntake,
  buildProfileCard,
  profileDivergence,
  INTAKE_ITEMS,
} from '@rpcs1/core';
import type { ReceiverProfile, IntakeAnswers } from '@rpcs1/core';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Resolve a receiver profile from either an explicit vector or intake answers. */
function resolveProfile(params: Record<string, unknown>): ReceiverProfile | undefined {
  if (params.profile && typeof params.profile === 'object') return params.profile as ReceiverProfile;
  if (params.answers && typeof params.answers === 'object') return scoreIntake(params.answers as IntakeAnswers);
  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tool, ...params } = body;

    switch (tool) {
      case 'interpret': {
        // Profile-aware when a user vector/answers are supplied; otherwise legacy behavior.
        const profile = resolveProfile(params);
        const result = profile
          ? interpretProfiled(params.text || '', params.risk || 'advice', profile)
          : interpret(params.text || '', params.risk || 'advice');
        return NextResponse.json(result);
      }
      case 'normalize': {
        const result = normalize(params.text || '');
        return NextResponse.json(result);
      }
      case 'split': {
        const result = split(params.text || '');
        return NextResponse.json(result);
      }
      case 'rewrite': {
        // The user's receiver vector becomes the style. Falls back to a fixed style name.
        const profile = resolveProfile(params);
        const result = profile
          ? rewriteForProfile(params.text || '', profile)
          : rewrite(params.text || '', params.style || 'plain');
        return NextResponse.json(result);
      }
      case 'route': {
        const result = route(params.task_type || 'chat', params.objective, params.allow_multi_model);
        return NextResponse.json(result);
      }
      case 'score': {
        const candidates = Array.isArray(params.candidates) ? params.candidates : [];
        const result = score(candidates, params.risk || 'casual');
        return NextResponse.json(result);
      }
      case 'intake': {
        // 1) No input → return the questions to render.
        if (!params.answers && !(params.self && params.observed)) {
          return NextResponse.json({ items: INTAKE_ITEMS });
        }
        // 2) self + observed vectors → the self-vs-observed mirror.
        if (params.self && params.observed) {
          return NextResponse.json(
            profileDivergence(params.self as ReceiverProfile, params.observed as ReceiverProfile),
          );
        }
        // 3) answers → profile + directives + editable card.
        const profile = scoreIntake(params.answers as IntakeAnswers);
        // buildProfileCard already returns { profile, directives, summary } — return it directly.
        return NextResponse.json(buildProfileCard(profile));
      }
      case 'manifest': {
        return NextResponse.json({
          protocol: 'RPCS-1 / HF-HATP v1.9',
          version: '1.9.0',
          tools: {
            interpret: { description: 'Interpret a message using RPCS-1', parameters: { text: 'string (required)', risk: 'casual|advice|high-stakes|safety-critical', profile: 'optional ReceiverProfile', answers: 'optional intake answers' } },
            normalize: { description: 'Normalize fragmented human input' },
            split: { description: 'Split mixed intents' },
            rewrite: { description: 'Rewrite for the user. Pass profile/answers to tune to the receiver vector; or style for a fixed style.', styles: ['technical', 'plain', 'socially_gentle', 'concise', 'detailed', 'direct'] },
            route: { description: 'Route a task to a model family' },
            score: { description: 'Score candidates with the Signature Ambiguity Framework' },
            intake: { description: 'User-side receiver profiling. No args → questions; {answers} → profile+card; {self,observed} → self-vs-observed mirror.' },
          },
        });
      }
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Request error: ${msg}` }, { status: 500 });
  }
}
