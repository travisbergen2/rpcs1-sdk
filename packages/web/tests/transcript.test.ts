import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapToParameters, rewriteForProfile, type ReceiverProfile } from '@rpcs1/core';
import { AGENT_PLATFORM, NEUTRAL_PROFILE, buildModelEquation } from '../lib/instrument';
import {
  ANSWER_SYSTEM,
  EMPTY_TRANSCRIPT,
  LIMITS,
  READ_SETTINGS,
  READ_SYSTEM,
  RENDER_GUARD,
  RENDER_TEMPERATURE,
  TRANSCRIPT_STORAGE_KEY,
  WHAT_LEAVES,
  addCorrection,
  appendField,
  buildAnswerMessages,
  buildReadMessages,
  buildRenderMessages,
  contextFor,
  encodeFrame,
  extractSseDeltas,
  modelCallSettings,
  modelStance,
  newTurn,
  parseFrames,
  parseTranscript,
  parseTranscriptRequest,
  patchTurn,
  pendingTurn,
  registerSample,
  removeTurn,
  renderCallSettings,
  renderInstruction,
  serializeTranscript,
  type Frame,
  type Turn,
  type TranscriptState,
} from '../lib/transcript';
import { streamChatCompletion } from '../lib/transcript-stream';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
const profile = (over: Partial<ReceiverProfile>): ReceiverProfile => ({ ...NEUTRAL_PROFILE, ...over });

/** A deterministic spread of profiles across the space (no randomness in tests). */
const GRID: ReceiverProfile[] = [];
for (const TI of [0, 39, 40, 61, 100]) {
  for (const AR of [0, 50, 100]) {
    GRID.push({ TI, SG: (TI + 37) % 101, FT: (AR + 63) % 101, UE: (TI * 3) % 101, AR });
  }
}

/** A completed turn: reading confirmed, reply done, rendered present. */
function doneTurn(id: string, you: string, reading: string, reply: string, rendered = `${reply} (yours)`): Turn {
  return {
    ...newTurn(id, you),
    reading,
    readingStatus: 'confirmed',
    reply,
    rendered,
    replyStatus: 'done',
    engine: 'gateway:test-model',
  };
}

const state = (...turns: Turn[]): TranscriptState => ({ v: 1, turns });

// ─── Turns and reducers ───────────────────────────────────────────────────────

describe('turns — reducers are pure and targeted', () => {
  it('newTurn starts streaming a reading with nothing else set', () => {
    const t = newTurn('a', 'hi there');
    expect(t.you).toBe('hi there');
    expect(t.readingStatus).toBe('streaming');
    expect(t.replyStatus).toBe('idle');
    expect(t.reading).toBe('');
    expect(t.corrections).toEqual([]);
    expect(t.edited).toBe(false);
    expect(t.engine).toBeNull();
  });

  it('patchTurn and appendField touch only the named turn and return new objects', () => {
    const s0 = state(newTurn('a', 'one'), newTurn('b', 'two'));
    const s1 = appendField(s0, 'b', 'reading', 'Hel');
    const s2 = appendField(s1, 'b', 'reading', 'lo');
    expect(s2.turns[1].reading).toBe('Hello');
    expect(s2.turns[0].reading).toBe('');
    expect(s2).not.toBe(s0);
    expect(s0.turns[1].reading).toBe('');
    const s3 = patchTurn(s2, 'a', { readingStatus: 'awaiting' });
    expect(s3.turns[0].readingStatus).toBe('awaiting');
    expect(s3.turns[1].readingStatus).toBe('streaming');
  });

  it('addCorrection keeps order and caps at LIMITS.maxCorrections; removeTurn drops by id', () => {
    let s = state(newTurn('a', 'x'));
    for (let i = 0; i < LIMITS.maxCorrections + 3; i++) s = addCorrection(s, 'a', `c${i}`);
    expect(s.turns[0].corrections).toHaveLength(LIMITS.maxCorrections);
    expect(s.turns[0].corrections.at(-1)).toBe(`c${LIMITS.maxCorrections + 2}`);
    expect(removeTurn(s, 'a').turns).toHaveLength(0);
    expect(removeTurn(s, 'nope').turns).toHaveLength(1);
  });

  it('pendingTurn is the last turn only while its reading is streaming or awaiting', () => {
    expect(pendingTurn([])).toBeNull();
    const a = doneTurn('a', 'q', 'Q', 'A');
    expect(pendingTurn([a])).toBeNull();
    const b = newTurn('b', 'next');
    expect(pendingTurn([a, b])?.id).toBe('b');
    expect(pendingTurn([a, { ...b, readingStatus: 'awaiting' }])?.id).toBe('b');
    expect(pendingTurn([a, { ...b, readingStatus: 'error' }])).toBeNull();
    // An unreleased turn that is not last is not "pending" (it cannot happen through the UI, but the rule is positional).
    expect(pendingTurn([b, a])).toBeNull();
  });
});

// ─── What the model is run on ────────────────────────────────────────────────

describe('contextFor — the model’s context is the conversation in ITS register', () => {
  it('returns prior completed turns as { reading, reply }, never the raw words, stopping before the given turn', () => {
    const a = doneTurn('a', 'raw a', 'READ A', 'REPLY A');
    const b = doneTurn('b', 'raw b', 'READ B', 'REPLY B');
    const c = newTurn('c', 'raw c');
    const ctx = contextFor([a, b, c], 'c');
    expect(ctx).toEqual([
      { reading: 'READ A', reply: 'REPLY A' },
      { reading: 'READ B', reply: 'REPLY B' },
    ]);
    expect(JSON.stringify(ctx)).not.toContain('raw');
    expect(contextFor([a, b, c], 'b')).toEqual([{ reading: 'READ A', reply: 'REPLY A' }]);
  });

  it('skips turns that did not complete (unconfirmed, errored, empty) and caps at LIMITS.maxPriorTurns', () => {
    const turns: Turn[] = [];
    for (let i = 0; i < LIMITS.maxPriorTurns + 5; i++) turns.push(doneTurn(`t${i}`, `w${i}`, `R${i}`, `A${i}`));
    turns.push({ ...doneTurn('e', 'w', 'R', 'A'), replyStatus: 'error' });
    turns.push({ ...doneTurn('u', 'w', 'R', 'A'), readingStatus: 'awaiting' });
    turns.push({ ...doneTurn('z', 'w', 'R', '   '), reply: '   ' });
    const ctx = contextFor(turns);
    expect(ctx).toHaveLength(LIMITS.maxPriorTurns);
    expect(ctx[0].reading).toBe('R5'); // the oldest were dropped, the newest kept
    expect(ctx.at(-1)?.reading).toBe(`R${LIMITS.maxPriorTurns + 4}`);
  });
});

describe('registerSample — your own words, newest first, capped', () => {
  it('includes messages and corrections, newest first, whitespace collapsed', () => {
    const a = { ...doneTurn('a', 'first  message\n\nhere', 'R', 'A'), corrections: ['fix one'] };
    const b = { ...newTurn('b', 'second'), corrections: ['fix two', 'fix three'] };
    expect(registerSample([a, b])).toEqual(['fix three', 'fix two', 'second', 'fix one', 'first message here']);
  });

  it('never exceeds LIMITS.maxSamples entries or LIMITS.sampleChars characters, and skips blanks', () => {
    const turns: Turn[] = [];
    for (let i = 0; i < 30; i++) turns.push(doneTurn(`t${i}`, i % 7 === 0 ? '   ' : 'x'.repeat(200), 'R', 'A'));
    const s = registerSample(turns);
    expect(s.length).toBeLessThanOrEqual(LIMITS.maxSamples);
    expect(s.reduce((n, x) => n + x.length, 0)).toBeLessThanOrEqual(LIMITS.sampleChars);
    expect(s.every((x) => x.trim().length > 0)).toBe(true);
    // 1500 / 200 = 7 full entries then a truncated 8th
    expect(s).toHaveLength(8);
    expect(s[7]).toHaveLength(100);
  });

  it('is empty for an empty conversation', () => {
    expect(registerSample([])).toEqual([]);
  });
});

// ─── Storage ─────────────────────────────────────────────────────────────────

describe('storage — round trip and normalization of interrupted turns', () => {
  it('round-trips completed turns exactly under the versioned key', () => {
    expect(TRANSCRIPT_STORAGE_KEY).toBe('ef.transcript.v1');
    const s = state(doneTurn('a', 'hi', 'HI', 'hello', 'hey'), { ...newTurn('b', 'x'), reading: 'X', readingStatus: 'awaiting', edited: true });
    const back = parseTranscript(serializeTranscript(s));
    expect(back).toEqual(s);
  });

  it('garbage, missing turns, and non-JSON return null; an empty list parses to an empty transcript', () => {
    expect(parseTranscript(null)).toBeNull();
    expect(parseTranscript('')).toBeNull();
    expect(parseTranscript('not json')).toBeNull();
    expect(parseTranscript('{"v":1}')).toBeNull();
    expect(parseTranscript('[]')).toBeNull();
    expect(parseTranscript('{"v":1,"turns":[]}')).toEqual(EMPTY_TRANSCRIPT);
  });

  it('a reading caught mid-stream becomes awaiting when text arrived, and is dropped when nothing did', () => {
    const s = state({ ...newTurn('a', 'q'), reading: 'partial' }, newTurn('b', 'q2'));
    const back = parseTranscript(serializeTranscript(s))!;
    expect(back.turns).toHaveLength(1);
    expect(back.turns[0].readingStatus).toBe('awaiting');
    expect(back.turns[0].reading).toBe('partial');
  });

  it('a reply caught mid-stream or mid-render becomes an error you can answer again; a partial rendering is never kept', () => {
    const streaming = { ...doneTurn('a', 'q', 'Q', 'partial reply'), replyStatus: 'streaming' as const, rendered: '' };
    const rendering = { ...doneTurn('b', 'q', 'Q', 'full reply'), replyStatus: 'rendering' as const, rendered: 'half of yo' };
    const back = parseTranscript(serializeTranscript(state(streaming, rendering)))!;
    expect(back.turns[0].replyStatus).toBe('error');
    expect(back.turns[0].reply).toBe('partial reply');
    expect(back.turns[0].error).toMatch(/Answer again/);
    expect(back.turns[1].replyStatus).toBe('error');
    expect(back.turns[1].rendered).toBe('');
  });

  it('turns whose reading was never confirmed carry no reply state', () => {
    const odd = { ...doneTurn('a', 'q', 'Q', 'A'), readingStatus: 'awaiting' as const };
    const back = parseTranscript(serializeTranscript(state(odd)))!;
    expect(back.turns[0].reply).toBe('');
    expect(back.turns[0].rendered).toBe('');
    expect(back.turns[0].replyStatus).toBe('idle');
  });

  it('skips malformed entries but keeps the well-formed ones', () => {
    const raw = JSON.stringify({ v: 1, turns: [null, 5, { id: 'x' }, { id: 'ok', you: 'y', reading: 'R', readingStatus: 'awaiting' }] });
    const back = parseTranscript(raw)!;
    expect(back.turns.map((t) => t.id)).toEqual(['ok']);
  });
});

// ─── Wire formats ────────────────────────────────────────────────────────────

describe('NDJSON frames — encode / parse across chunk boundaries', () => {
  it('encodes one frame per line and parses complete lines, carrying the unterminated tail', () => {
    const frames: Frame[] = [
      { t: 'reading', d: 'multi\nline' },
      { t: 'done', engine: 'gateway:m' },
    ];
    const wire = frames.map(encodeFrame).join('');
    expect(wire.endsWith('\n')).toBe(true);
    const cut = wire.length - 5;
    const got: Frame[] = [];
    const carry = parseFrames(wire.slice(0, cut), (f) => got.push(f));
    expect(got).toEqual([frames[0]]); // the newline inside the text is escaped, never a frame boundary
    expect(carry).toBe(wire.slice(wire.lastIndexOf('\n', cut - 1) + 1, cut));
    const rest = parseFrames(carry + wire.slice(cut), (f) => got.push(f));
    expect(rest).toBe('');
    expect(got).toEqual(frames);
  });

  it('ignores blank and malformed lines and frames of unknown shape', () => {
    const got: Frame[] = [];
    parseFrames('\n\nnot json\n{"t":"reading"}\n{"t":"nope","d":"x"}\n{"t":"error","code":"c","message":"m"}\n', (f) => got.push(f));
    expect(got).toEqual([{ t: 'error', code: 'c', message: 'm' }]);
  });
});

describe('extractSseDeltas — OpenAI-compatible stream: true', () => {
  const sse = (delta: Record<string, unknown>) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;

  it('collects content deltas, ignores role-only and empty deltas and comments, and flags [DONE]', () => {
    const buf = ': keep-alive\n\n' + sse({ role: 'assistant', content: '' }) + sse({ content: 'Hel' }) + sse({ content: 'lo' }) + 'data: [DONE]\n\n';
    const r = extractSseDeltas(buf);
    expect(r.deltas).toEqual(['Hel', 'lo']);
    expect(r.done).toBe(true);
    expect(r.carry).toBe('');
  });

  it('carries a partial JSON line instead of dropping it, and tolerates CRLF', () => {
    const whole = sse({ content: 'abc' }).replace(/\n/g, '\r\n');
    const first = extractSseDeltas(whole.slice(0, 20));
    expect(first.deltas).toEqual([]);
    expect(first.carry).toBe(whole.slice(0, 20));
    const second = extractSseDeltas(first.carry + whole.slice(20));
    expect(second.deltas).toEqual(['abc']);
    expect(second.done).toBe(false);
  });
});

// ─── The upstream call ───────────────────────────────────────────────────────

describe('streamChatCompletion — drives an OpenAI-compatible endpoint with stream: true', () => {
  const endpoint = { apiKey: 'k-test', baseUrl: 'https://example.test/v1/', model: 'test-model' };
  const sse = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

  function sseResponse(chunks: string[], status = 200): Response {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const ch of chunks) c.enqueue(enc.encode(ch));
        c.close();
      },
    });
    return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
  }

  it('posts the messages and settings, bears the key, streams deltas in order, and resolves with the full text', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return sseResponse([sse('Hel'), 'data: ' + JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] }) + '\n\n', sse('lo'), ' wor'.length ? sse(' wor') : '', sse('ld'), 'data: [DONE]\n\n']);
    }) as typeof fetch;
    const seen: string[] = [];
    const full = await streamChatCompletion(
      endpoint,
      [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }],
      { temperature: 0.3, top_p: 0.7, max_tokens: 512 },
      (d) => seen.push(d),
      { fetchImpl },
    );
    expect(full).toBe('Hello world');
    expect(seen).toEqual(['Hel', 'lo', ' wor', 'ld']);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/v1/chat/completions'); // trailing slash normalized
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer k-test');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toEqual({
      model: 'test-model',
      messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }],
      temperature: 0.3,
      top_p: 0.7,
      max_tokens: 512,
      stream: true,
    });
  });

  it('omits top_p when the settings have none', async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      body = JSON.parse(String(init!.body));
      return sseResponse([sse('ok'), 'data: [DONE]\n\n']);
    }) as typeof fetch;
    await streamChatCompletion(endpoint, [{ role: 'user', content: 'U' }], { temperature: 0.2, max_tokens: 100 }, () => {}, { fetchImpl });
    expect('top_p' in body).toBe(false);
  });

  it('throws on a non-2xx response without echoing the provider body, and on an empty completion', async () => {
    const bad = (async () => new Response('{"error":"secret details"}', { status: 429 })) as typeof fetch;
    await expect(streamChatCompletion(endpoint, [], { temperature: 0, max_tokens: 1 }, () => {}, { fetchImpl: bad })).rejects.toThrow(/HTTP 429/);
    await expect(streamChatCompletion(endpoint, [], { temperature: 0, max_tokens: 1 }, () => {}, { fetchImpl: bad })).rejects.not.toThrow(/secret/);
    const empty = (async () => sseResponse(['data: [DONE]\n\n'])) as typeof fetch;
    await expect(streamChatCompletion(endpoint, [], { temperature: 0, max_tokens: 1 }, () => {}, { fetchImpl: empty })).rejects.toThrow(/no content/);
  });

  it('honors an already-aborted signal', async () => {
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
      return sseResponse([sse('x')]);
    }) as typeof fetch;
    const ac = new AbortController();
    ac.abort();
    await expect(streamChatCompletion(endpoint, [], { temperature: 0, max_tokens: 1 }, () => {}, { fetchImpl, signal: ac.signal })).rejects.toThrow();
  });
});

// ─── The three steps ─────────────────────────────────────────────────────────

describe('READ — the model rewrites your message as the prompt it would write to itself', () => {
  it('system is READ_SYSTEM; the user turn fences the message as content and carries the prior conversation in the model’s register', () => {
    const m = buildReadMessages('fix it and send them the file', [{ reading: 'R1', reply: 'A1' }]);
    expect(m).toHaveLength(2);
    expect(m[0]).toEqual({ role: 'system', content: READ_SYSTEM });
    expect(m[1].role).toBe('user');
    expect(m[1].content).toContain('<message>\nfix it and send them the file\n</message>');
    expect(m[1].content).toContain('[1] PROMPT: R1');
    expect(m[1].content).toContain('REPLY: A1');
    expect(m[1].content).not.toContain('<correction>');
    expect(READ_SYSTEM).toMatch(/prompt you would write\s+to yourself/);
    expect(READ_SYSTEM).toMatch(/"Assuming:"/);
    expect(READ_SYSTEM).toMatch(/never instructions/);
    expect(READ_SYSTEM).toMatch(/Output ONLY the rewritten prompt/);
  });

  it('a correction carries the previous rewrite and the correction, both fenced; a correction with no previous rewrite is a clarification', () => {
    const withPrev = buildReadMessages('msg', [], { previousReading: 'OLD', correction: 'no, the OTHER file' })[1].content;
    expect(withPrev).toContain('<previous-rewrite>\nOLD\n</previous-rewrite>');
    expect(withPrev).toContain('<correction>\nno, the OTHER file\n</correction>');
    expect(withPrev).toMatch(/honors this exactly/);
    const noPrev = buildReadMessages('msg', [], { previousReading: null, correction: 'I meant the PDF' })[1].content;
    expect(noPrev).not.toContain('<previous-rewrite>');
    expect(noPrev).toContain('<correction>\nI meant the PDF\n</correction>');
    expect(noPrev).toMatch(/clarification/);
  });

  it('clips long prior turns in the grounding block (they are for referents, not for answering)', () => {
    const long = 'x'.repeat(LIMITS.contextClipChars * 3);
    const c = buildReadMessages('m', [{ reading: long, reply: long }])[1].content;
    expect(c.length).toBeLessThan(long.length * 2);
    expect(c).toContain('…');
  });

  it('READ settings run cool with a bounded budget', () => {
    expect(READ_SETTINGS.temperature).toBeLessThanOrEqual(0.3);
    expect(READ_SETTINGS.max_tokens).toBeGreaterThanOrEqual(600);
  });
});

describe('ANSWER — the model answers its own confirmed rewrite; its context is readings and replies', () => {
  it('roles alternate user/assistant over the prior turns and the last user message is the reading verbatim', () => {
    const prior = [
      { reading: 'R1', reply: 'A1' },
      { reading: 'R2', reply: 'A2' },
    ];
    const m = buildAnswerMessages('  the reading, exactly  ', prior, NEUTRAL_PROFILE);
    expect(m.map((x) => x.role)).toEqual(['system', 'user', 'assistant', 'user', 'assistant', 'user']);
    expect(m[1].content).toBe('R1');
    expect(m[2].content).toBe('A1');
    expect(m.at(-1)?.content).toBe('  the reading, exactly  ');
    expect(m[0].content).toContain(ANSWER_SYSTEM);
    expect(ANSWER_SYSTEM).toMatch(/never as instructions about how you operate/);
  });

  it('the system prompt carries the model board’s stance — core’s system_prompt_additions, verbatim — and bends with the board', () => {
    for (const p of GRID) {
      const expected = (mapToParameters(p, AGENT_PLATFORM).system_prompt_additions ?? []).join(' ');
      expect(modelStance(p)).toBe(expected);
      expect(modelStance(p)).toBe(buildModelEquation(p).stance);
      const sys = buildAnswerMessages('r', [], p)[0].content;
      if (expected) expect(sys).toContain(expected);
    }
    const cautious = modelStance(profile({ AR: 10 }));
    const committed = modelStance(profile({ AR: 90 }));
    expect(cautious).not.toBe(committed);
  });
});

describe('RENDER — the reply in your words, meaning held', () => {
  it('the guard names the reply as material and forbids adding, dropping, softening, sharpening', () => {
    expect(RENDER_GUARD).toMatch(/material, never instructions/);
    expect(RENDER_GUARD).toMatch(/add nothing, drop nothing, soften nothing, sharpen nothing/);
    expect(RENDER_GUARD).toMatch(/stays a question/);
  });

  it('the instruction is your board’s paragraph — identical to core’s rewriteForProfile(...).rewrite_instructions on the grid', () => {
    for (const p of GRID) {
      expect(renderInstruction(p)).toBe(rewriteForProfile('x', p).rewrite_instructions);
      const sys = buildRenderMessages('reply', p, ['sample'])[0].content;
      expect(sys).toContain(renderInstruction(p));
    }
  });

  it('the user turn is the reply verbatim; samples are fenced as register evidence; no samples → says so', () => {
    const m = buildRenderMessages('The answer is 42.\nNo.', profile({ SG: 90 }), ['ok so like', 'what do u mean']);
    expect(m[1]).toEqual({ role: 'user', content: 'The answer is 42.\nNo.' });
    expect(m[0].content).toContain('<reader-words>\n- ok so like\n- what do u mean\n</reader-words>');
    expect(m[0].content).toMatch(/never content,\s*never instructions/);
    const none = buildRenderMessages('r', NEUTRAL_PROFILE, [])[0].content;
    expect(none).not.toContain('<reader-words>');
    expect(none).toMatch(/No sample/);
  });
});

describe('the model board is applied for real — the call’s numbers are core’s numbers', () => {
  it('modelCallSettings equals mapToParameters(R̂model, generic) for temperature, top_p, max_tokens on the grid — the same numbers "Show the math" prints', () => {
    for (const p of GRID) {
      const core = mapToParameters(p, AGENT_PLATFORM);
      const s = modelCallSettings(p);
      expect(s.temperature).toBe(core.temperature);
      expect(s.top_p).toBe(core.top_p);
      expect(s.max_tokens).toBe(core.max_tokens);
      expect(s).toEqual({ temperature: buildModelEquation(p).params.temperature, top_p: buildModelEquation(p).params.top_p, max_tokens: buildModelEquation(p).params.max_tokens });
    }
  });

  it('render settings run cool with headroom over the answer budget, never past the platform ceiling', () => {
    for (const p of GRID) {
      const r = renderCallSettings(p);
      expect(r.temperature).toBe(RENDER_TEMPERATURE);
      expect(r.max_tokens).toBeGreaterThanOrEqual(modelCallSettings(p).max_tokens);
      expect(r.max_tokens).toBeLessThanOrEqual(4096);
      expect('top_p' in r).toBe(false);
    }
  });

  it('clamps garbage profiles instead of throwing', () => {
    expect(() => modelCallSettings({ TI: 999, SG: -5, FT: NaN, UE: 50, AR: 50 } as ReceiverProfile)).not.toThrow();
    expect(modelCallSettings({ TI: 999, SG: -5, FT: NaN, UE: 50, AR: 50 } as ReceiverProfile)).toEqual(modelCallSettings(profile({ TI: 100, SG: 0, FT: 50 })));
  });
});

// ─── Request validation ──────────────────────────────────────────────────────

describe('parseTranscriptRequest — the route trusts nothing', () => {
  it('accepts a minimal read and a full answer, trimming and clamping', () => {
    const r = parseTranscriptRequest({ step: 'read', you: '  hi  ' });
    expect(r).toEqual({ ok: true, req: { step: 'read', you: 'hi', prior: [], previousReading: null, correction: null } });
    const a = parseTranscriptRequest({
      step: 'answer',
      reading: 'R',
      prior: [{ reading: 'p', reply: 'q' }],
      you: { TI: 120, SG: 50, FT: 50, UE: 50, AR: -1 },
      model: 'not an object',
      samples: ['a', '', 7, 'b'],
    });
    expect(a.ok).toBe(true);
    if (a.ok && a.req.step === 'answer') {
      expect(a.req.you).toEqual(profile({ TI: 100, AR: 0 }));
      expect(a.req.model).toEqual(NEUTRAL_PROFILE);
      expect(a.req.samples).toEqual(['a', 'b']);
      expect(a.req.prior).toEqual([{ reading: 'p', reply: 'q' }]);
    }
  });

  it('rejects non-objects, unknown steps, missing or oversized text, and malformed prior', () => {
    expect(parseTranscriptRequest(null).ok).toBe(false);
    expect(parseTranscriptRequest('x').ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'dance', you: 'x' }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'read' }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'read', you: '   ' }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'read', you: 'x'.repeat(LIMITS.maxChars + 1) }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'read', you: 'x', prior: 'nope' }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'read', you: 'x', prior: [{ reading: 'r' }] }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'answer', reading: '' }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'answer', reading: 'r', samples: 'x' }).ok).toBe(false);
    expect(parseTranscriptRequest({ step: 'read', you: 'x', correction: 'y'.repeat(LIMITS.maxChars + 1) }).ok).toBe(false);
  });

  it('keeps only the newest LIMITS.maxPriorTurns prior turns', () => {
    const prior = Array.from({ length: LIMITS.maxPriorTurns + 4 }, (_, i) => ({ reading: `r${i}`, reply: `a${i}` }));
    const r = parseTranscriptRequest({ step: 'read', you: 'x', prior });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.req.prior).toHaveLength(LIMITS.maxPriorTurns);
      expect(r.req.prior[0].reading).toBe('r4');
    }
  });
});

// ─── Disclosure and source ratchets ──────────────────────────────────────────

describe('what leaves the machine, and the route', () => {
  it('WHAT_LEAVES states the transmission, the non-storage, the browser-only transcript, and reports the provider per reply', () => {
    expect(WHAT_LEAVES).toMatch(/Send, Correct, or Go/);
    expect(WHAT_LEAVES).toMatch(/both boards/);
    expect(WHAT_LEAVES).toMatch(/does not store/);
    expect(WHAT_LEAVES).toMatch(/this browser only/);
    expect(WHAT_LEAVES).toMatch(/named under each reply/);
    expect(WHAT_LEAVES).not.toMatch(/Gemini|OpenAI|Google/); // never asserted statically — reported by the route
  });

  it('the route gates on the shared budget and the gateway config, streams NDJSON, and never echoes provider errors', () => {
    const route = read('app/api/transcript/route.ts');
    expect(route).toContain('allowModelCall(request)');
    expect(route).toContain('getGatewayConfig()');
    expect(route).toContain('parseTranscriptRequest(body)');
    expect(route).toContain("req.step === 'read'");
    expect(route).toContain('buildAnswerMessages(');
    expect(route).toContain('buildRenderMessages(');
    expect(route).toContain('modelCallSettings(req.model)');
    expect(route).toContain('renderCallSettings(req.model)');
    expect(route).toContain('application/x-ndjson');
    expect(route).toContain('export const maxDuration = 60');
    expect(route).toMatch(/status: 503/);
    expect(route).toMatch(/status: 429/);
    expect(route).toMatch(/Model temporarily unavailable/);
  });

  it('the gateway exposes the same endpoint the backend wraps', () => {
    const gateway = read('lib/gateway.ts');
    expect(gateway).toContain('export function getGatewayConfig()');
    expect(gateway).toContain('const cfg = getGatewayConfig();');
    expect(gateway).toMatch(/new GatewayBackend\(\{ apiKey: cfg\.apiKey, baseUrl: cfg\.baseUrl, model: cfg\.model \}\)/);
  });
});
