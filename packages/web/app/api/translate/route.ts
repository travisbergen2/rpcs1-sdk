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
  interpretWithModel,
  rewriteForProfile,
  scoreIntake,
  buildProfileCard,
  profileDivergence,
  INTAKE_ITEMS,
  routeIntent,
  DEFAULT_INTENT_HYPOTHESES,
  buildForkView,
  buildSculpt,
  buildLoopMessages,
  finalizeRound,
  LOOP_ANSWER_GUARD,
} from '@rpcs1/core';
import { getGatewayBackend, allowModelCall, REWRITE_GUARD } from '@/lib/gateway';
import type { ReceiverProfile, IntakeAnswers, LoopSpan } from '@rpcs1/core';

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
      case 'route_intent': {
        // Entropy routing: commit / present options / clarify over competing readings.
        const profile = resolveProfile(params);
        const text = typeof params.text === 'string' ? params.text : '';
        if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });
        const hypotheses = Array.isArray(params.hypotheses) && params.hypotheses.length >= 2
          ? params.hypotheses
          : DEFAULT_INTENT_HYPOTHESES;
        const likelihoods = params.likelihoods && typeof params.likelihoods === 'object'
          ? (params.likelihoods as Record<string, number>)
          : undefined;
        return NextResponse.json(routeIntent(text, hypotheses, { profile, likelihoods }));
      }
      case 'interpret': {
        const profile = resolveProfile(params);
        const text = params.text || '';
        const risk = params.risk || 'advice';
        const context = Array.isArray(params.context)
          ? (params.context as unknown[]).filter((t): t is string => typeof t === 'string').slice(-12)
          : undefined;
        // Model-backed perception when the gateway is configured and budget
        // allows; deterministic RPCS-1 decision layer either way. Falls back
        // to the rules engine on any backend failure (engine field says which).
        const backend = getGatewayBackend();
        if (backend && allowModelCall(request)) {
          const result = await interpretWithModel(text, backend, {
            risk,
            profile,
            context,
            fallbackToRules: true,
          });
          return NextResponse.json(result);
        }
        const result = profile
          ? interpretProfiled(text, risk, profile)
          : interpret(text, risk);
        return NextResponse.json({ ...result, engine: 'rules' });
      }
      case 'fork': {
        // Receiver-side fork view: deterministic mirror floor + model-path
        // branch grower. The rules-path interpret output is excluded inside
        // buildForkView (2026-08-15 calibration: rules flagged 47/47 items
        // incl. all controls — no discrimination), so a budget-exhausted
        // call still returns the honest mirror-only view.
        const profile = resolveProfile(params);
        const text = typeof params.text === 'string' ? params.text : '';
        if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });
        const risk = params.risk || 'advice';
        const context = Array.isArray(params.context)
          ? (params.context as unknown[]).filter((t): t is string => typeof t === 'string').slice(-12)
          : undefined;
        const rejected = Array.isArray(params.rejected)
          ? (params.rejected as unknown[]).filter((r): r is string => typeof r === 'string').slice(0, 12)
          : undefined;
        // floor:true = deterministic mirror floor only — no model call, no
        // budget consumption. Passive underlining runs on this for free;
        // the model joins only on explicit interaction (picker open/re-roll).
        if (params.floor === true) {
          return NextResponse.json(buildForkView(text, null, { rejected }));
        }
        const backend = getGatewayBackend();
        let interp = null;
        if (backend && allowModelCall(request)) {
          interp = await interpretWithModel(text, backend, { risk, profile, context, fallbackToRules: true, avoidReadings: rejected });
        } else {
          interp = profile ? interpretProfiled(text, risk, profile) : interpret(text, risk);
          interp = { ...interp, engine: 'rules' };
        }
        return NextResponse.json(buildForkView(text, interp, { rejected }));
      }
      case 'sculpt': {
        // Whole-prompt guidance (v0 deterministic — no model call, no budget).
        // Accept/skip per change; preview never auto-applies (SC-1 design).
        const text = typeof params.text === 'string' ? params.text : '';
        if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });
        return NextResponse.json(buildSculpt(text));
      }
      case 'loop': {
        // The Loop (Phase A hero): brain dump → precise interpretation as
        // elected-span rounds. Elected spans are enforced verbatim by the
        // core ratchet (verify → mechanical repair) — never by trusting the
        // model. Requires the model: there is no rules fallback that can
        // reinterpret, so an unavailable gateway returns an honest 503.
        const dump = typeof params.text === 'string' ? params.text.trim() : '';
        if (!dump) return NextResponse.json({ error: 'text is required' }, { status: 400 });
        if (dump.length > 8000) {
          return NextResponse.json({ error: 'text too long (8000 char max for the loop)' }, { status: 400 });
        }
        const prevSpans = Array.isArray(params.spans)
          ? (params.spans as unknown[]).filter(
              (s): s is LoopSpan =>
                !!s && typeof s === 'object' &&
                typeof (s as LoopSpan).id === 'string' &&
                typeof (s as LoopSpan).text === 'string',
            ).slice(0, 64)
          : [];
        const electedIds = Array.isArray(params.electedIds)
          ? (params.electedIds as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 64)
          : [];
        const backend = getGatewayBackend();
        if (!backend) {
          return NextResponse.json(
            { error: 'model_unavailable', message: 'The loop needs the model and it is not configured right now.' },
            { status: 503 },
          );
        }
        if (!allowModelCall(request)) {
          return NextResponse.json(
            { error: 'budget_exhausted', message: 'Daily free budget reached — try again later.' },
            { status: 429 },
          );
        }
        const prev = prevSpans.length > 0 && electedIds.length > 0
          ? { spans: prevSpans, electedIds }
          : undefined;
        // Optional grounding snippets (Phase B vault priors). Shape-checked
        // here; caps enforced deterministically inside buildLoopMessages.
        const contextSnippets = Array.isArray(params.contextSnippets)
          ? (params.contextSnippets as unknown[])
              .filter(
                (s): s is { source: string; text: string } =>
                  !!s && typeof s === 'object' &&
                  typeof (s as { source?: unknown }).source === 'string' &&
                  typeof (s as { text?: unknown }).text === 'string',
              )
              .slice(0, 12)
          : undefined;
        const messages = buildLoopMessages(dump, prev, undefined, contextSnippets);
        let round = null;
        try {
          const raw = await backend.complete(messages.system, messages.user, 1200);
          round = finalizeRound(raw, prev);
          if (!round) {
            // One stricter retry on unparseable output, then honest failure.
            const retryRaw = await backend.complete(
              messages.system + '\n\nREMINDER: output ONLY the JSON array. No prose. No code fence.',
              messages.user,
              1200,
            );
            round = finalizeRound(retryRaw, prev);
          }
        } catch {
          return NextResponse.json(
            { error: 'model_error', message: 'Model temporarily unavailable — try again.' },
            { status: 502 },
          );
        }
        if (!round) {
          return NextResponse.json(
            { error: 'unparseable', message: 'The model did not return a usable interpretation — try again.' },
            { status: 502 },
          );
        }
        return NextResponse.json({
          spans: round.spans,
          repaired: round.repaired,
          violations: round.violations,
          engine: backend.name,
        });
      }
      case 'loop_answer': {
        // Optional in-app answer for a converged loop prompt. Prompt-out
        // (copy into the user's own AI) is always available without this.
        const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
        if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        if (prompt.length > 8000) {
          return NextResponse.json({ error: 'prompt too long (8000 char max)' }, { status: 400 });
        }
        const backend = getGatewayBackend();
        if (!backend) {
          return NextResponse.json(
            { error: 'model_unavailable', message: 'Answering here needs the model and it is not configured right now.' },
            { status: 503 },
          );
        }
        if (!allowModelCall(request)) {
          return NextResponse.json(
            { error: 'budget_exhausted', message: 'Daily free budget reached — copy the prompt into your own AI instead.' },
            { status: 429 },
          );
        }
        try {
          const answer = await backend.complete(LOOP_ANSWER_GUARD, prompt, 1200);
          return NextResponse.json({ answer, engine: backend.name });
        } catch {
          return NextResponse.json(
            { error: 'model_error', message: 'Model temporarily unavailable — copy the prompt into your own AI instead.' },
            { status: 502 },
          );
        }
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
        const payload = profile
          ? rewriteForProfile(params.text || '', profile)
          : rewrite(params.text || '', params.style || 'plain');
        // Execute the rewrite when the gateway is configured — this is the
        // step that used to be left to "pass this payload to an LLM".
        const backend = getGatewayBackend();
        if (backend && payload.rewrite_instructions && !payload.note?.startsWith('Invalid')) {
          if (allowModelCall(request)) {
            try {
              const rewritten = await backend.complete(
                REWRITE_GUARD + payload.rewrite_instructions,
                params.text || '',
              );
              return NextResponse.json({
                ...payload,
                rewritten,
                note: 'Rewritten by the configured model using the instructions above.',
                engine: backend.name,
              });
            } catch {
              return NextResponse.json({ ...payload, engine: 'rules', note: payload.note + ' (Model temporarily unavailable — instructions returned unexecuted.)' });
            }
          }
          return NextResponse.json({ ...payload, engine: 'rules', note: payload.note + ' (Daily free budget reached — instructions returned unexecuted.)' });
        }
        return NextResponse.json({ ...payload, engine: 'rules' });
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
          protocol: 'RPCS-1 / HF-HATP v2.0',
          version: '2.0.0',
          tools: {
            interpret: { description: 'Interpret a message using RPCS-1', parameters: { text: 'string (required)', risk: 'casual|advice|high-stakes|safety-critical', profile: 'optional ReceiverProfile', answers: 'optional intake answers' } },
            loop: { description: 'The Loop: brain dump → precise interpretation as selectable spans. Lock the spans that read right; each round re-derives ONLY the rest, with locked spans enforced verbatim by a mechanical ratchet (verify → repair). Repeat to convergence, then send the finished prompt.', parameters: { text: 'string (required) — the raw dump', spans: 'optional LoopSpan[] from the previous round', electedIds: 'optional string[] — ids of locked spans' } },
            loop_answer: { description: 'Answer a converged loop prompt in-app (optional; copying the prompt into your own AI is always available).', parameters: { prompt: 'string (required)' } },
            sculpt: { description: 'Whole-prompt guidance toward the most comprehensible form: X→Y substitutions with reasons, pointer fill-in holes, multi-ask enumeration. Deterministic; accept/skip per change.', parameters: { text: 'string (required)' } },
            fork: { description: 'Receiver-side fork view: how could this message read? Deterministic mirror floor + model readings; returns branches, ask-back question, forked-answer scaffold.', parameters: { text: 'string (required)', risk: 'casual|advice|high-stakes|safety-critical', context: 'optional string[] prior turns', profile: 'optional ReceiverProfile' } },
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
