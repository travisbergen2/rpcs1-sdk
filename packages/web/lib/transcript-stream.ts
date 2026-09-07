/**
 * Streaming chat completion over an OpenAI-compatible endpoint — the one
 * upstream call the transcript route makes, three times per turn at most
 * (READ; then ANSWER and RENDER back to back).
 *
 * Server-side only in practice (it carries the key), but written without
 * Node-only imports so the test suite can drive it with an injected fetch that
 * serves canned SSE bytes. The provider's error body is deliberately never
 * surfaced — it can echo request details.
 */

import { extractSseDeltas, type CallSettings, type ChatMessage } from '@/lib/transcript';

/** Structurally identical to lib/gateway.ts's GatewayConfig — kept separate so this module stays import-light. */
export interface ChatEndpoint {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface StreamOptions {
  /** Aborts the upstream call (e.g. the page closed the connection). */
  signal?: AbortSignal;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
  /** Whole-call timeout (default 45 s). */
  timeoutMs?: number;
}

export const DEFAULT_STREAM_TIMEOUT_MS = 45_000;

/**
 * POST `stream: true` to `${baseUrl}/chat/completions`, feed every content
 * delta to onDelta as it arrives, and resolve with the full text. Throws on a
 * non-2xx response, a missing body, or an empty completion.
 */
export async function streamChatCompletion(
  endpoint: ChatEndpoint,
  messages: ReadonlyArray<ChatMessage>,
  settings: CallSettings,
  onDelta: (delta: string) => void,
  opts: StreamOptions = {},
): Promise<string> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', onAbort);
  }
  try {
    const resp = await fetchImpl(`${endpoint.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({
        model: endpoint.model,
        messages,
        temperature: settings.temperature,
        ...(settings.top_p !== undefined ? { top_p: settings.top_p } : {}),
        max_tokens: settings.max_tokens,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`model request failed: HTTP ${resp.status}`);
    if (!resp.body) throw new Error('model response had no body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let carry = '';
    let full = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = extractSseDeltas(carry + decoder.decode(value, { stream: true }));
      carry = chunk.carry;
      for (const d of chunk.deltas) {
        full += d;
        onDelta(d);
      }
      if (chunk.done) break;
    }
    if (carry.trim()) {
      // A final line without a trailing newline.
      for (const d of extractSseDeltas(carry + '\n').deltas) {
        full += d;
        onDelta(d);
      }
    }
    if (!full.trim()) throw new Error('model returned no content');
    return full;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}
