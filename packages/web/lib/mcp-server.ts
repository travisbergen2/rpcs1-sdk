import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  recommend,
  INTAKE_ITEMS,
  scoreIntake,
  buildProfileCard,
  routeIntent,
  DEFAULT_INTENT_HYPOTHESES,
  type IntakeAnswers,
  type ReceiverProfile,
  type IntentHypothesis,
  type Likelihoods,
} from '@rpcs1/core';
import { interpret, normalize, rewrite, rewriteForProfile } from '@/lib/translator';
import { buildForkView } from '@rpcs1/core';
import { z } from 'zod';
import { recommendInputSchema, recommendationOutputSchema } from './recommend-schema';
import { MCP_SERVER_VERSION } from './mcp-version';

// Engine honesty stamp: every tool on this server runs deterministically —
// no model call is ever made over MCP. Stamped into rendered output so no
// client has to guess which brain answered (2026-08-17 finding: a client
// architected on interpret's rules engine without knowing it was rules).
const ENGINE_RULES = '\n\nEngine: rules (deterministic — no model call)';
const ENGINE_MIRROR = '\n\nEngine: mirror-only (deterministic floor — no model call)';

// Shared zod shape for a ReceiverProfile travelling as a tool parameter.
// The server is stateless: the user's profile lives client-side (project
// memory, custom instructions, or a saved JSON) and rides along per call.
const receiverProfileSchema = z.object({
  TI: z.number().min(0).max(100).describe('Temporal Integration: 0 = bottom line first, 100 = full context first'),
  SG: z.number().min(0).max(100).describe('Signal Gain: 0 = flat and factual, 100 = warm and expressive'),
  FT: z.number().min(0).max(100).describe('Filtering Threshold: 100 = explicit and literal, 0 = subtext lands'),
  UE: z.number().min(0).max(100).describe('Update Elasticity: 100 = pushback welcome, 0 = prefers consistency'),
  AR: z.number().min(0).max(100).describe('Ambiguity Resolution: 100 = commit to best reading, 0 = clarify first'),
});



export function createRpcs1McpServer() {
  const server = new McpServer(
    {
      name: 'rpcs1-agent-tuner',
      title: 'RPCS-1 Agent Tuner & Translation Bridge',
      version: MCP_SERVER_VERSION,
      websiteUrl: 'https://rpcs1.dev',
      description:
        'Three capabilities: (1) Diagnose why your AI agent will fail before rollout — get the right temperature, ' +
        'top_p, and strategy settings. (2) Translate ambiguous human input — interpret intent, normalize fragmented ' +
        'text, and rewrite for any audience. (3) The Translation Bridge — calibrate a per-user receiver profile ' +
        '(five continuous primitives, never a category label) and render every reply for that user’s ' +
        'communication style.',
    },
    {
      instructions:
        'Use this server for three categories of work. Category 1 — Agent tuning: Call recommend_agent_configuration ' +
        'when designing, tuning, or diagnosing an AI agent. Category 2 — Translation: Call interpret when a user says ' +
        'something ambiguous. Call normalize when input is fragmented. Call rewrite when text needs tone adjustment. ' +
        'Category 3 — Translation Bridge (per-user adaptation): Call calibrate_profile once to build the user’s ' +
        'ReceiverProfile from five quick questions (store the returned JSON in the user’s notes/memory for reuse). ' +
        'Then, on EVERY reply to that user, call render_reply with your draft and their profile, and apply the ' +
        'returned instructions before answering. When the user’s request is ambiguous, call prepare_prompt with ' +
        'their text and profile to recover intent before acting. This is the loop: prepare_prompt on the way in, ' +
        'render_reply on the way out. When the user\u2019s request could mean several different things, call ' +
        'route_intent \u2014 and YOU propose the candidate readings: 3\u20137 short hypotheses covering the plausible ' +
        'interpretations of THIS message (including likely-typo readings and idiom-vs-literal readings), with your ' +
        'own likelihood estimates. The built-in default set is a generic product-intent starter, not an ' +
        'interpretation engine \u2014 passing it for arbitrary sentences yields uniform confusion over irrelevant ' +
        'options. Division of labor: the model GENERATES the branches; the deterministic router HOLDS them, scores ' +
        'the ambiguity, and decides commit / present options / clarify. route_intent is the AUTHORITY on ' +
        'commit-vs-clarify; prepare_prompt supplies the canonical translation and recovered entities \u2014 when the ' +
        'two disagree on whether to ask, follow route_intent.',
    },
  );

  // ── Tool: recommend_agent_configuration ────────────────────────

  server.registerTool(
    'recommend_agent_configuration',
    {
      title: 'Recommend AI agent configuration',
      description:
        'Diagnose why a deployed AI agent may fail. Takes environmental entropy, predictability, stakes, ' +
        'context horizon, and commitment style, then returns receiver profile values (TI, SG, FT, UE, AR), ' +
        'platform parameters (temperature, top_p, strategy), regime prediction, reasoning, and warnings. ' +
        'Optionally pass target_model (the actual model id) to attach MEASURED per-model receiver posture ' +
        '(E-LIT table): evidence-graded literalness, truth-override boundary, and translation directives. ' +
        'Deterministic, stateless, read-only — does not store past recommendations.',
      inputSchema: recommendInputSchema,
      outputSchema: recommendationOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
      _meta: {
        'openai/toolInvocation/invoking': 'Analyzing agent-environment fit',
        'openai/toolInvocation/invoked': 'Agent configuration ready',
      },
    },
    async (input) => {
      const result = recommend(input);
      const profile = result.receiver_profile;
      const nextTest = suggestNextTest(result.predicted_regime, result.warnings);
      const evidence = result.platform_parameters.receiver_evidence;
      return {
        structuredContent: { ...result } as Record<string, unknown>,
        content: [{
          type: 'text',
          text: [
            `Status: ${result.predicted_regime} (${result.confidence} confidence).`,
            `Receiver profile: TI ${Math.round(profile.TI)}, SG ${Math.round(profile.SG)}, FT ${Math.round(profile.FT)}, UE ${Math.round(profile.UE)}, AR ${Math.round(profile.AR)}.`,
            `Configuration: temperature ${result.platform_parameters.temperature}, ${result.platform_parameters.context_strategy}, ${result.platform_parameters.tool_use_strategy}.`,
            evidence
              ? `Measured receiver posture applied: ${evidence.display_name} (${evidence.grade} grade, LI-2 ${evidence.li2}, override boundary ${evidence.ob}).`
              : '',
            `Best next check: ${nextTest}.`,
          ].filter(Boolean).join(' ') + ENGINE_RULES,
        }],
      };
    },
  );

  // ── Tool: interpret ────────────────────────────────────────────

  server.registerTool(
    'interpret',
    {
      title: 'Interpret ambiguous human input',
      description:
        'Detect ambiguity in user messages using the RPCS-1 Signature Ambiguity Framework. Returns AR level ' +
        '(AR0-AR5), confidence, candidate interpretations with scores, clarifying questions, and suggested next step. ' +
        'Use when a user says something vague, passive-aggressive, or underspecified.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('The message to interpret.'),
        risk: z.enum(['casual', 'advice', 'high-stakes', 'safety-critical'])
          .default('advice').describe('Risk category for ambiguity threshold.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
            const result = interpret(input.text, input.risk);
      const lines: string[] = [];
      lines.push(`INPUT: "${result.original}"`);
      lines.push('');
      if (result.recovered_entities.length > 0) {
        lines.push('\u2500 Recovered Entities \u2500');
        for (const entity of result.recovered_entities) {
          lines.push(`  ${entity.original} \u2192 ${entity.candidate.text} (${Math.round(entity.candidate.confidence * 100)}%)`);
          for (const alt of entity.alternatives) {
            lines.push(`    (alt: ${alt.text}, ${Math.round(alt.confidence * 100)}%)`);
          }
        }
        lines.push('');
      }
      lines.push(`Intent: ${result.recovered_intent.type} (${Math.round(result.recovered_intent.confidence * 100)}%)`);
      lines.push('');
      lines.push(`Canonical Translation: "${result.canonical_translation}"`);
      lines.push('');
      lines.push(`Translation Integrity: ${result.translation_integrity}%`);
      lines.push(`Playback: ${result.playback_required ? 'Required' : 'Not Required'}`);
      lines.push(`AR Level: ${result.ar_level}`);
      if (result.clarifying_questions.length > 0) {
        lines.push('');
        lines.push(`Clarify: ${result.clarifying_questions[0]}`);
      }
      return { structuredContent: { ...result, engine: 'rules' } as Record<string, unknown>, content: [{ type: 'text', text: lines.join('\n') + ENGINE_RULES }] };
    },
  );

  // ── Tool: fork ─────────────────────────────────────────────────

  server.registerTool(
    'fork',
    {
      title: 'Fork view — how could this message read?',
      description:
        'The calibrated ambiguity surface: deterministic structural fork detectors (reference, scope, grouping, ' +
        'compare-vs-choose, polysemy) with character-offset spans, plus per-reading one-line clarifiers the sender ' +
        'can append to lock a reading in. Returns competing readings, an ask-back question, and a forked-answer ' +
        'scaffold. Silent on clean text by contract. Runs the deterministic mirror floor only over MCP (no model). ' +
        'Prefer this over interpret for span-level ambiguity detection: interpret\u2019s entity list is a word-list ' +
        'engine (calibrated 2026-08-15: no discrimination on conversational text) \u2014 advisory only.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('The message to analyze for forks.'),
        rejected: z.array(z.string()).max(12).optional()
          .describe('Reading summaries the user already rejected \u2014 never re-offered.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = buildForkView(input.text, null, { rejected: input.rejected });
      const lines: string[] = [];
      lines.push(`INPUT: \"${result.original}\"`);
      lines.push(`Status: ${result.status}`);
      if (result.spans.length > 0) {
        lines.push('');
        lines.push('\u2500 Fork Spans (character offsets) \u2500');
        for (const sp of result.spans) {
          lines.push(`  [${sp.start}\u2013${sp.end}] \"${sp.text}\" (${sp.kind}): ${sp.why}`);
        }
      }
      if (result.branches.length > 0) {
        lines.push('');
        lines.push('\u2500 Readings \u2500');
        for (const b of result.branches) {
          lines.push(`  \u2022 ${b.summary}`);
          if (b.clarifier) lines.push(`    lock it in: \"${b.clarifier}\"`);
          if (b.consequence) lines.push(`    if wrong: ${b.consequence}`);
        }
      }
      if (result.branch_question) {
        lines.push('');
        lines.push(`Ask-back: ${result.branch_question}`);
      }
      if (result.forked_answer_scaffold) {
        lines.push('');
        lines.push(`Forked answer scaffold:\n${result.forked_answer_scaffold}`);
      }
      if (result.status === 'clean') {
        lines.push('');
        lines.push('No structural fork detected \u2014 the detectors stay silent on clean text by contract.');
      }
      return { structuredContent: { ...result } as Record<string, unknown>, content: [{ type: 'text', text: lines.join('\n') + ENGINE_MIRROR }] };
    },
  );

  // ── Tool: normalize ────────────────────────────────────────────

  server.registerTool(
    'normalize',
    {
      title: 'Normalize fragmented human input',
      description:
        'Clean up text with ellipses, fragments, and run-on thoughts into coherent prose. ' +
        'Use when a user types stream-of-consciousness or fragmented input.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('Fragmented text to normalize.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = normalize(input.text);
      return {
        structuredContent: { ...result } as Record<string, unknown>,
        content: [{ type: 'text', text: (result.normalized || input.text) + ENGINE_RULES }],
      };
    },
  );

  // ── Tool: rewrite ──────────────────────────────────────────────

  server.registerTool(
    'rewrite',
    {
      title: 'Rewrite text for a target audience',
      description:
        'Get rewrite instructions for adapting text to a specific style: technical, plain, socially_gentle, ' +
        'concise, detailed, or direct. Use when communication needs tone adjustment.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('Text to rewrite.'),
        style: z.enum(['technical', 'plain', 'socially_gentle', 'concise', 'detailed', 'direct'])
          .default('plain').describe('Target audience style.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = rewrite(input.text, input.style);
      return {
        structuredContent: { ...result } as Record<string, unknown>,
        content: [{
          type: 'text',
          text: result.rewrite_instructions
            ? `Style: ${result.style_label}\n\nInstructions: ${result.rewrite_instructions}`
            : `Rewrite unavailable for style "${input.style}"`,
        }],
      };
    },
  );

  // ── Tool: calibrate_profile (Translation Bridge) ───────────────

  server.registerTool(
    'calibrate_profile',
    {
      title: 'Calibrate a user’s receiver profile',
      description:
        'Build a ReceiverProfile (TI, SG, FT, UE, AR — continuous 0-100, never a category label) from five ' +
        'behavioral forced-choice answers. Call with NO answers to get the five questions to ask the user; ' +
        'call again with their answers (a/b/c per primitive) to get the profile. Store the returned profile ' +
        'JSON in the user’s notes or memory and pass it to render_reply / prepare_prompt on every turn. ' +
        'Deterministic and stateless — nothing is stored server-side. Schema: https://rpcs1.dev/v1/receiver-profile.json',
      inputSchema: {
        answers: z.object({
          TI: z.enum(['a', 'b', 'c']).optional(),
          SG: z.enum(['a', 'b', 'c']).optional(),
          FT: z.enum(['a', 'b', 'c']).optional(),
          UE: z.enum(['a', 'b', 'c']).optional(),
          AR: z.enum(['a', 'b', 'c']).optional(),
        }).optional().describe('Chosen option id per primitive. Omit entirely to receive the questions.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const answers = input.answers as IntakeAnswers | undefined;
      if (!answers || Object.keys(answers).length === 0) {
        const questions = INTAKE_ITEMS.map((item, i) =>
          [`${i + 1}. [${item.primitive}] ${item.prompt}`,
            ...item.options.map((o) => `   ${o.id}) ${o.label}`)].join('\n'),
        ).join('\n\n');
        return {
          structuredContent: { items: INTAKE_ITEMS } as unknown as Record<string, unknown>,
          content: [{
            type: 'text',
            text:
              'Ask the user these five questions (one per receiver primitive), then call calibrate_profile ' +
              'again with their answers:\n\n' + questions,
          }],
        };
      }
      const profile = scoreIntake(answers);
      const card = buildProfileCard(profile);
      const doc = {
        $schema: 'https://rpcs1.dev/v1/receiver-profile.json',
        version: '1.0',
        profile,
        directives: {
          structure: card.directives.structure,
          warmth: card.directives.warmth,
          explicitness: card.directives.explicitness,
          revision: card.directives.revision,
          ambiguity: card.directives.ambiguity,
        },
        meta: { source: 'intake', generator: `rpcs1-mcp@${MCP_SERVER_VERSION}` },
      };
      return {
        structuredContent: doc as unknown as Record<string, unknown>,
        content: [{
          type: 'text',
          text:
            `${card.summary}\n\nSave this profile JSON in the user’s notes/memory and pass it to ` +
            `render_reply on every turn:\n\n${JSON.stringify(doc, null, 2)}`,
        }],
      };
    },
  );

  // ── Tool: prepare_prompt (Translation Bridge — inbound) ────────

  server.registerTool(
    'prepare_prompt',
    {
      title: 'Prepare a user’s message before acting on it',
      description:
        'The inbound half of the Translation Bridge loop. Takes the user’s raw message (possibly ambiguous, ' +
        'fragmented, or underspecified) plus their ReceiverProfile, and returns the recovered intent, a canonical ' +
        'translation to act on, ambiguity level, and — profile-aware — whether to clarify or commit. ' +
        'Call this before acting on any ambiguous user request. Scope note: its detectors are lexical/structural ' +
        '(vague signals, ambiguous references) \u2014 for the commit-vs-clarify DECISION, route_intent (with your own ' +
        'proposed readings) is the authority; when they disagree, follow route_intent.',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('The user’s raw message.'),
        risk: z.enum(['casual', 'advice', 'high-stakes', 'safety-critical'])
          .default('advice').describe('Risk category for the ambiguity threshold.'),
        profile: receiverProfileSchema.optional()
          .describe('The user’s ReceiverProfile from calibrate_profile. Shapes clarify-vs-commit behavior.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = interpret(input.text, input.risk, input.profile as ReceiverProfile | undefined);
      const lines = [
        `Canonical translation (act on this): "${result.canonical_translation}"`,
        `Intent: ${result.recovered_intent.type} (${Math.round(result.recovered_intent.confidence * 100)}%) · AR level: ${result.ar_level} · integrity: ${result.translation_integrity}%`,
      ];
      if (result.clarifying_questions.length > 0) {
        lines.push(`Clarify first: ${result.clarifying_questions[0]}`);
      }
      return {
        structuredContent: { ...result } as Record<string, unknown>,
        content: [{ type: 'text', text: lines.join('\n') + ENGINE_RULES }],
      };
    },
  );

  // ── Tool: render_reply (Translation Bridge — outbound) ─────────

  server.registerTool(
    'render_reply',
    {
      title: 'Render a reply for a specific user’s receiver profile',
      description:
        'The outbound half of the Translation Bridge loop. Takes your draft reply plus the user’s ReceiverProfile ' +
        'and returns deterministic rendering instructions (structure, warmth, explicitness, revision posture, ' +
        'ambiguity handling — each with a why-trace). Apply the instructions to your draft before answering. ' +
        'Call this on every reply to a calibrated user.',
      inputSchema: {
        text: z.string().min(1).max(10000).describe('Your draft reply.'),
        profile: receiverProfileSchema.describe('The user’s ReceiverProfile from calibrate_profile.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const result = rewriteForProfile(input.text, input.profile as ReceiverProfile);
      return {
        structuredContent: { ...result } as Record<string, unknown>,
        content: [{
          type: 'text',
          text:
            `${result.style_description}\n\nRewrite your draft per these instructions, then send:\n` +
            `${result.rewrite_instructions}`,
        }],
      };
    },
  );


  // ── Tool: route_intent (entropy routing — commit vs clarify) ──

  server.registerTool(
    'route_intent',
    {
      title: 'Route an ambiguous request: commit, present options, or clarify',
      description:
        'Entropy routing over competing interpretations \u2014 the model proposes, the deterministic core disposes. ' +
        'YOU generate the candidate readings of the user\u2019s message (3\u20137 short hypotheses covering the plausible ' +
        'interpretations, INCLUDING likely-typo readings, idiom-vs-literal readings, and domain senses) and pass ' +
        'them as hypotheses, ideally with your own likelihoods (0\u20131 per reading) AND a paraphrase per reading \u2014 ' +
        'the user\u2019s message rewritten unambiguously under that interpretation, so the user can VERIFY intent by ' +
        'recognition before anything commits (one misread prompt skews a whole thread). The router computes the posterior ' +
        'and its normalized entropy T\u0302 and returns the decision: commit (one reading dominates), commit_with_note ' +
        '(close alternative disclosed), present_options (several readings live), or clarify (ask before acting \u2014 ' +
        'open-endedly when nothing discriminates). Thresholds adapt to the user\u2019s ReceiverProfile (AR widens/narrows ' +
        'the commit region; high FT discloses near-ties). This tool is the commit-vs-clarify AUTHORITY in the ' +
        'pipeline. Omitting hypotheses falls back to a generic six-intent PRODUCT-ROUTING starter set \u2014 do not use ' +
        'the fallback for interpreting arbitrary sentences. Deterministic, stateless, read-only. Benchmarked: RTEB ' +
        'v1.1 (developer-bench grade; see docs/routing.md).',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('The user\u2019s raw message.'),
        hypotheses: z.array(z.object({
          id: z.string().min(1).max(64),
          label: z.string().min(1).max(200),
          cues: z.array(z.string().min(1).max(64)).max(32).optional()
            .describe('Lexical cues for the built-in scorer; omit when passing likelihoods.'),
          paraphrase: z.string().min(1).max(500).optional()
            .describe('The user\u2019s message REWRITTEN UNAMBIGUOUSLY under this reading. Strongly recommended: when the router asks, the user verifies intent by reading these restatements, not by decoding labels.'),
          prior: z.number().positive().optional(),
        })).min(2).max(24).optional()
          .describe('Candidate interpretations. Omit to use a generic six-intent starter set plus a catch-all.'),
        likelihoods: z.record(z.string(), z.number().min(0)).optional()
          .describe('Optional externally computed likelihood per hypothesis id (e.g. model-derived) — replaces the lexical scorer.'),
        profile: receiverProfileSchema.optional()
          .describe('The user\u2019s ReceiverProfile from calibrate_profile. Shapes commit-vs-clarify thresholds.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async (input) => {
      const hypotheses = (input.hypotheses as IntentHypothesis[] | undefined) ?? DEFAULT_INTENT_HYPOTHESES;
      const decision = routeIntent(input.text, hypotheses, {
        profile: input.profile as ReceiverProfile | undefined,
        likelihoods: input.likelihoods as Likelihoods | undefined,
      });
      const lines = [
        `Decision: ${decision.mode} \u2014 top reading: "${decision.top.label}" (p=${decision.top.p.toFixed(2)}, T\u0302=${decision.posterior.normalizedEntropy.toFixed(2)})`,
        decision.why,
      ];
      if (decision.clarifyingQuestion) lines.push(`Ask the user: ${decision.clarifyingQuestion}`);
      if (decision.options) {
        lines.push('Live readings \u2014 relay these to the user for verification:');
        for (const o of decision.options) {
          lines.push(`  \u2022 ${o.label} (${(100 * o.p).toFixed(0)}%)${o.paraphrase ? ` \u2014 \u201c${o.paraphrase}\u201d` : ''}`);
        }
      }
      return {
        structuredContent: {
          mode: decision.mode,
          top: decision.top,
          posterior: decision.posterior,
          thresholds: decision.thresholds,
          why: decision.why,
          clarifyingQuestion: decision.clarifyingQuestion,
          options: decision.options,
        } as Record<string, unknown>,
        content: [{ type: 'text', text: lines.join('\n') + ENGINE_RULES }],
      };
    },
  );

  return server;
}

function suggestNextTest(regime: string, warnings: string[]): string {
  const w = warnings[0] ?? '';
  if (w.includes('Oscillation')) return 'rerun with one shorter-history case and one ambiguous case';
  if (w.includes('Overload')) return 'rerun with a high-pressure case and lower signal gain';
  if (w.includes('Freeze')) return 'rerun with a policy edge case and lower filtering threshold';
  if (regime === 'near_oscillation') return 'rerun with a shorter context window';
  if (regime === 'near_overload') return 'rerun with stricter gating before tool use';
  if (regime === 'near_freeze') return 'rerun with a lower filtering threshold';
  return 'rerun on the same workload plus one harder edge case';
}
