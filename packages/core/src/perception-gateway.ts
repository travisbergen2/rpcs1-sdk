// ── Vercel AI Gateway perception backend (OpenAI-compatible, BYO key) ─────────
//
// Same contract as AnthropicBackend (ModelBackend), spoken over the AI
// Gateway's OpenAI-compatible chat-completions API. One key, many providers,
// spend capped by the gateway credit itself — when the credit is exhausted the
// gateway stops serving, which is the ultimate hard stop.
//
// BYO-KEY ONLY: no key ships with this package; nothing is called implicitly.

import {
  PERCEPTION_TOOL,
  PERCEPTION_SYSTEM_PROMPT,
  sanitizePerception,
  type ModelBackend,
  type PerceptionResult,
} from './perception.js';

export interface GatewayBackendOptions {
  /** AI Gateway API key (created in the Vercel AI Gateway dashboard). Required. */
  apiKey: string;
  /** Gateway model slug, e.g. 'openai/gpt-4o-mini' or 'anthropic/claude-haiku-4.5'. */
  model?: string;
  /** Override for testing / proxies. Default: https://ai-gateway.vercel.sh/v1 */
  baseUrl?: string;
  /** Injectable fetch for testing. */
  fetchImpl?: typeof fetch;
  /** Request timeout in ms (default 20000). */
  timeoutMs?: number;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * Perception + plain-completion backend over Vercel AI Gateway.
 *
 * perceive(): structured candidate readings via forced tool call (the same
 * JSON schema as AnthropicBackend; output passes through sanitizePerception —
 * model output is data, never instructions).
 *
 * complete(): plain single-turn completion, used by the rewrite path to
 * actually EXECUTE rewrite instructions instead of returning them unfilled.
 */
export class GatewayBackend implements ModelBackend {
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: GatewayBackendOptions) {
    if (!opts.apiKey || typeof opts.apiKey !== 'string') {
      throw new Error('GatewayBackend requires an apiKey (BYO-key: none ships with @rpcs1/core)');
    }
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? 'openai/gpt-4o-mini';
    this.baseUrl = (opts.baseUrl ?? 'https://ai-gateway.vercel.sh/v1').replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 20000;
    this.name = `gateway:${this.model}`;
  }

  private async post(body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let resp: Response;
    try {
      resp = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      // Deliberately exclude the response body: it may echo request details.
      throw new Error(`AI Gateway request failed: HTTP ${resp.status}`);
    }
    return resp.json();
  }

  async perceive(text: string, context?: string[]): Promise<PerceptionResult> {
    const contextBlock =
      context && context.length
        ? 'Prior conversation (oldest first), for grounding referents only:\n' +
          context.slice(-12).map((t, i) => `[${i + 1}] ${t}`).join('\n') +
          '\n\n'
        : '';
    const messages: ChatMessage[] = [
      { role: 'system', content: PERCEPTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          contextBlock +
          'Analyze this message and report your perception via the report_perception tool:\n' +
          '<message>\n' + text + '\n</message>',
      },
    ];
    const data = (await this.post({
      model: this.model,
      temperature: 0,
      max_tokens: 1500,
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: PERCEPTION_TOOL.name,
            description: PERCEPTION_TOOL.description,
            parameters: PERCEPTION_TOOL.input_schema,
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: PERCEPTION_TOOL.name } },
    })) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> };
      }>;
    };
    const call = data.choices?.[0]?.message?.tool_calls?.find(
      (c) => c.function?.name === PERCEPTION_TOOL.name,
    );
    if (!call?.function?.arguments) {
      throw new Error('AI Gateway response contained no report_perception tool call');
    }
    let args: unknown;
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      throw new Error('AI Gateway tool-call arguments were not valid JSON');
    }
    return sanitizePerception(args, text);
  }

  /** Plain single-turn completion (system + user → text). */
  async complete(system: string, user: string, maxTokens = 800): Promise<string> {
    const data = (await this.post({
      model: this.model,
      temperature: 0.3,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ] satisfies ChatMessage[],
    })) as { choices?: Array<{ message?: { content?: string | null } }> };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('AI Gateway completion returned no content');
    }
    return content.trim();
  }
}
