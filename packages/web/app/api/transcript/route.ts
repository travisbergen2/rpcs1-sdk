/**
 * The transcript route — the two model steps behind the homepage's live
 * conversation, streamed as NDJSON frames (lib/transcript.ts: Frame).
 *
 * POST /api/transcript
 *   { step: "read",   you, prior, previousReading?, correction? }
 *     → frames { t: "reading", d } …  { t: "done", engine }
 *   { step: "answer", reading, prior, you: R̂you, model: R̂model, samples }
 *     → frames { t: "reply", d } …  { t: "rendered", d } …  { t: "done", engine }
 *   Any step may end with { t: "error", code, message } instead of done.
 *
 * Before the stream opens, plain JSON errors: 400 (bad request), 503
 * (model_unavailable — no key configured; there is no rules fallback that can
 * converse), 429 (budget_exhausted — the same per-IP / global daily budget the
 * loop and translator use, one unit per request; a turn is two requests).
 *
 * The model board is applied for real: the ANSWER call's temperature, top_p,
 * and max_tokens are core's mapToParameters(R̂model, 'generic'); its stance
 * sentences are in the system prompt. Your board's instruction is the RENDER
 * call's instruction. Nothing here is stored; the transcript lives in the
 * visitor's browser (lib/transcript-store.ts).
 */
import { NextResponse } from 'next/server';
import { allowModelCall, getGatewayConfig } from '@/lib/gateway';
import {
  READ_SETTINGS,
  buildAnswerMessages,
  buildReadMessages,
  buildRenderMessages,
  encodeFrame,
  modelCallSettings,
  parseTranscriptRequest,
  renderCallSettings,
  type Frame,
} from '@/lib/transcript';
import { streamChatCompletion } from '@/lib/transcript-stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** READ ≈ one call; ANSWER + RENDER ≈ two back to back. 60 s is the Hobby-plan ceiling and ample for either. */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_json', message: 'Request body must be JSON.' }, { status: 400 });
  }
  const parsed = parseTranscriptRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'bad_request', message: parsed.error }, { status: 400 });
  }
  const cfg = getGatewayConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'model_unavailable', message: 'The conversation needs the model and it is not configured right now.' },
      { status: 503 },
    );
  }
  if (!allowModelCall(request)) {
    return NextResponse.json(
      {
        error: 'budget_exhausted',
        message: 'Daily budget reached — try again tomorrow, or take the reading to your own app.',
      },
      { status: 429 },
    );
  }

  const req = parsed.req;
  const encoder = new TextEncoder();
  const engine = `gateway:${cfg.model}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (f: Frame) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeFrame(f)));
        } catch {
          open = false; // the page went away — stop writing
        }
      };
      try {
        if (req.step === 'read') {
          await streamChatCompletion(
            cfg,
            buildReadMessages(req.you, req.prior, {
              previousReading: req.previousReading,
              correction: req.correction,
            }),
            READ_SETTINGS,
            (d) => send({ t: 'reading', d }),
            { signal: request.signal },
          );
        } else {
          const reply = await streamChatCompletion(
            cfg,
            buildAnswerMessages(req.reading, req.prior, req.model),
            modelCallSettings(req.model),
            (d) => send({ t: 'reply', d }),
            { signal: request.signal },
          );
          await streamChatCompletion(
            cfg,
            buildRenderMessages(reply, req.you, req.samples),
            renderCallSettings(req.model),
            (d) => send({ t: 'rendered', d }),
            { signal: request.signal },
          );
        }
        send({ t: 'done', engine });
      } catch {
        // Provider errors are never echoed (they can carry request details).
        send({ t: 'error', code: 'model_error', message: 'Model temporarily unavailable — try again.' });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  });
}
