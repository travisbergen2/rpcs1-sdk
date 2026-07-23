import { describe, it, expect } from 'vitest';
import { GatewayBackend } from '../src/perception-gateway';
import { interpretWithModel } from '../src/translator';

const AMBIG_ARGS = {
  entities: [
    { original: 'she', category: 'pronoun', candidates: [{ text: '[your manager]', confidence: 0.45 }, { text: '[the client]', confidence: 0.4 }] },
  ],
  intents: [{ type: 'question', confidence: 0.6 }],
  readings: [
    { label: 'mgr', paraphrase: 'Did the manager approve it?', interpConf: 0.45, userEvid: 0.4, epistemic: 0.5, narrative: 0.55, semGap: 0.5, transInteg: 0.6 },
    { label: 'client', paraphrase: 'Did the client approve it?', interpConf: 0.42, userEvid: 0.38, epistemic: 0.5, narrative: 0.55, semGap: 0.5, transInteg: 0.6 },
  ],
  canonicalTranslation: 'Did [ambiguous] approve it?',
};

function toolCallResponse(args: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        { message: { tool_calls: [{ function: { name: 'report_perception', arguments: JSON.stringify(args) } }] } },
      ],
    }),
    { status: 200 },
  );
}

describe('GatewayBackend (Vercel AI Gateway, OpenAI-compatible)', () => {
  it('refuses to construct without an apiKey', () => {
    // @ts-expect-error deliberate misuse
    expect(() => new GatewayBackend({})).toThrow(/apiKey/);
  });

  it('perceive: forced tool call, temperature 0, parses arguments JSON', async () => {
    const fetchImpl = (async (url: any, init: any) => {
      expect(String(url)).toContain('/chat/completions');
      const body = JSON.parse(init.body);
      expect(body.temperature).toBe(0);
      expect(body.tool_choice.function.name).toBe('report_perception');
      expect(init.headers.authorization).toMatch(/^Bearer /);
      return toolCallResponse(AMBIG_ARGS);
    }) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    const r = await be.perceive('did she approve it?');
    expect(r.readings.length).toBe(2);
    expect(r.entities[0].original).toBe('she');
    expect(be.name).toMatch(/^gateway:/);
  });

  it('feeds interpretWithModel end to end (deterministic decision on gateway output)', async () => {
    const fetchImpl = (async () => toolCallResponse(AMBIG_ARGS)) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    const out = await interpretWithModel('did she approve it?', be);
    expect(out.engine).toMatch(/^gateway:/);
    expect(out.playback_required).toBe(true);
    expect(out.clarifying_questions.join(' ')).toMatch(/"she"/);
  });

  it('complete: returns trimmed content', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '  Rewritten text. ' } }] }), { status: 200 })) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    expect(await be.complete('sys', 'user')).toBe('Rewritten text.');
  });

  it('complete: throws on empty content', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 })) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    await expect(be.complete('sys', 'user')).rejects.toThrow(/no content/);
  });

  it('surfaces HTTP failures without echoing the response body', async () => {
    const fetchImpl = (async () => new Response('{"error":"secret-echo"}', { status: 402 })) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    await expect(be.perceive('x')).rejects.toThrow(/HTTP 402/);
    await expect(be.perceive('x')).rejects.not.toThrow(/secret-echo/);
  });

  it('throws when the response has no tool call', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), { status: 200 })) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    await expect(be.perceive('x')).rejects.toThrow(/tool call/);
  });

  it('throws when tool-call arguments are malformed JSON', async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { name: 'report_perception', arguments: '{oops' } }] } }] }),
        { status: 200 },
      )) as unknown as typeof fetch;
    const be = new GatewayBackend({ apiKey: 'vck-test', fetchImpl });
    await expect(be.perceive('x')).rejects.toThrow(/valid JSON/);
  });
});
