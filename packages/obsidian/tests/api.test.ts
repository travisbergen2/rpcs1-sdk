import { describe, it, expect } from 'vitest';
import { LoopClient, LoopClientError, assembleFinalPrompt } from '../src/api.js';
import type { LoopSpan } from '@rpcs1/core';

type FetchLike = typeof fetch;

function fakeFetch(status: number, body: unknown): FetchLike {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as unknown as FetchLike;
}

const spans = (texts: string[], statuses?: Array<'kept' | 'revised'>): LoopSpan[] =>
  texts.map((text, i) => ({ id: `s${i + 1}`, text, status: statuses?.[i] ?? 'revised' }));

describe('LoopClient.startRound', () => {
  it('returns spans on a good response', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com/',
      fetchImpl: fakeFetch(200, { spans: spans(['One.', 'Two.']), repaired: false }),
    });
    const r = await client.startRound('dump');
    expect(r.spans).toHaveLength(2);
    expect(r.serverRepaired).toBe(false);
    expect(r.clientRepaired).toBe(false);
  });

  it('maps 503 model_unavailable to a friendly typed error', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(503, { error: 'model_unavailable', message: 'not configured' }),
    });
    await expect(client.startRound('dump')).rejects.toMatchObject({
      name: 'LoopClientError',
      kind: 'model_unavailable',
    });
  });

  it('maps 429 budget_exhausted', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(429, { error: 'budget_exhausted' }),
    });
    await expect(client.startRound('dump')).rejects.toMatchObject({ kind: 'budget_exhausted' });
  });

  it('rejects an empty-spans response as bad_response', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, { spans: [] }),
    });
    await expect(client.startRound('dump')).rejects.toMatchObject({ kind: 'bad_response' });
  });

  it('rejects non-JSON as bad_response', async () => {
    const notJson = (async () =>
      new Response('<html>oops</html>', { status: 200 })) as unknown as FetchLike;
    const client = new LoopClient({ endpoint: 'https://example.com', fetchImpl: notJson });
    await expect(client.startRound('dump')).rejects.toMatchObject({ kind: 'bad_response' });
  });
});

describe('LoopClient.nextRound — client-side ratchet (defense in depth)', () => {
  const prev = spans(['Locked line.', 'Loose line.']);

  it('passes through a compliant response untouched', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, {
        spans: spans(['Locked line.', 'Loose line, sharpened.'], ['kept', 'revised']),
        repaired: false,
      }),
    });
    const r = await client.nextRound('dump', prev, ['s1']);
    expect(r.clientRepaired).toBe(false);
    expect(r.spans[0].text).toBe('Locked line.');
  });

  it('repairs a response that mutated the locked line', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, {
        spans: spans(['Locked line, but touched.', 'New rest.'], ['kept', 'revised']),
        repaired: false,
      }),
    });
    const r = await client.nextRound('dump', prev, ['s1']);
    expect(r.clientRepaired).toBe(true);
    const locked = r.spans.find((s) => s.text === 'Locked line.');
    expect(locked).toBeDefined();
    expect(locked!.status).toBe('kept');
  });

  it('repairs a response that dropped the locked line entirely', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, {
        spans: spans(['Only new material.'], ['revised']),
        repaired: true,
      }),
    });
    const r = await client.nextRound('dump', prev, ['s1']);
    expect(r.clientRepaired).toBe(true);
    expect(r.serverRepaired).toBe(true);
    expect(r.spans.some((s) => s.text === 'Locked line.' && s.status === 'kept')).toBe(true);
  });

  it('accepts whitespace-normalized locked lines without repair', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, {
        spans: spans(['Locked  line.', 'Rest.'], ['kept', 'revised']),
        repaired: false,
      }),
    });
    const r = await client.nextRound('dump', prev, ['s1']);
    expect(r.clientRepaired).toBe(false);
  });
});

describe('LoopClient.answer', () => {
  it('returns the answer text', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, { answer: 'Here you go.', engine: 'gateway:test' }),
    });
    expect(await client.answer('prompt')).toBe('Here you go.');
  });

  it('rejects an empty answer as bad_response', async () => {
    const client = new LoopClient({
      endpoint: 'https://example.com',
      fetchImpl: fakeFetch(200, { answer: '  ' }),
    });
    await expect(client.answer('prompt')).rejects.toMatchObject({ kind: 'bad_response' });
  });
});

describe('assembleFinalPrompt', () => {
  it('joins spans in order, skipping empties', () => {
    expect(assembleFinalPrompt(spans(['One.', '  ', 'Two.']))).toBe('One. Two.');
  });
});

describe('LoopClientError', () => {
  it('carries kind and message', () => {
    const e = new LoopClientError('transient', 'oops');
    expect(e.kind).toBe('transient');
    expect(e.message).toBe('oops');
  });
});
