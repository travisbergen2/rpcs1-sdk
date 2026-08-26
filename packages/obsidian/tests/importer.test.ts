import { describe, it, expect } from 'vitest';
import {
  detectPayload,
  normalizeOpenAI,
  matchTerms,
  planImport,
  structuralMap,
  MIN_DISTINCT_TERMS,
  type RawConvo,
} from '../src/importer.js';

const claudeConvo = (name: string, text: string) => ({
  uuid: 'u1',
  name,
  created_at: '2026-08-25T12:00:00Z',
  chat_messages: [
    { sender: 'human', text },
    { sender: 'assistant', text: 'reply about ' + text.slice(0, 20) },
  ],
});

const openaiConvo = (title: string, text: string) => ({
  title,
  create_time: 1756100000,
  mapping: {
    a: { message: { author: { role: 'user' }, content: { parts: [text] }, create_time: 1 } },
    b: { message: { author: { role: 'assistant' }, content: { parts: ['sure: ' + text] }, create_time: 2 } },
    c: { message: null },
  },
});

describe('detectPayload', () => {
  it('detects a bare Claude array', () => {
    const p = detectPayload([claudeConvo('A', 'hello')]);
    expect(p.kind).toBe('claude');
    if (p.kind === 'claude') expect(p.convos[0].turns.length).toBe(2);
  });
  it('detects a wrapped Claude object', () => {
    const p = detectPayload({ conversations: [claudeConvo('A', 'hello')] });
    expect(p.kind).toBe('claude');
  });
  it('detects an OpenAI mapping array', () => {
    const p = detectPayload([openaiConvo('T', 'question about zeta')]);
    expect(p.kind).toBe('openai');
    if (p.kind === 'openai') {
      expect(p.convos[0].turns.map((t) => t.who)).toEqual(['You', 'Assistant']);
    }
  });
  it('detects the Claude v1.0 manifest and extracts the conversations URL', () => {
    const p = detectPayload({
      instructions: 'Download each file using the export_url.',
      total_files: 4,
      data_files: [
        { category: 'memories', export_url: 'https://x/m', filename: 'memories-000.zip' },
        { category: 'conversations', export_url: 'https://x/c', filename: 'conversations-000.zip' },
      ],
      version: '1.0',
    });
    expect(p.kind).toBe('claude-manifest');
    if (p.kind === 'claude-manifest') expect(p.conversationsUrl).toBe('https://x/c');
  });
  it('returns a keys-only structural map for unknown shapes', () => {
    const p = detectPayload({ account: { email: 'secret@example.com' }, blobs: 42 });
    expect(p.kind).toBe('unknown');
    if (p.kind === 'unknown') {
      expect(p.structuralMap).toContain('account: object');
      expect(p.structuralMap).not.toContain('secret@example.com'); // keys only, never values
    }
  });
});

describe('normalizeOpenAI ordering and filtering', () => {
  it('sorts by create_time and drops tool/multimodal parts', () => {
    const convos = normalizeOpenAI([
      {
        title: 'T',
        create_time: 1756100000,
        mapping: {
          b: { message: { author: { role: 'assistant' }, content: { parts: ['second'] }, create_time: 2 } },
          a: { message: { author: { role: 'user' }, content: { parts: ['first', { image: 'x' }] }, create_time: 1 } },
          t: { message: { author: { role: 'tool' }, content: { parts: ['hidden'] }, create_time: 1.5 } },
        },
      } as never,
    ]);
    expect(convos[0].turns.map((t) => t.text)).toEqual(['first', 'second']);
  });
});

describe('classification and planning', () => {
  it(`research-classifies at ≥${MIN_DISTINCT_TERMS} distinct terms; stubs carry no conversation content`, () => {
    const research: RawConvo = {
      title: 'Riemann toy',
      dateIso: '2026-08-25T12:00:00Z',
      turns: [{ who: 'You', text: 'zeta spectral toeplitz eigenvalue SECRET-BODY-TOKEN' }],
    };
    const personal: RawConvo = {
      title: 'Dinner plans',
      dateIso: '2026-08-25T12:00:00Z',
      turns: [{ who: 'You', text: 'what should I cook tonight' }],
    };
    expect(matchTerms(research).length).toBeGreaterThanOrEqual(MIN_DISTINCT_TERMS);
    expect(matchTerms(personal).length).toBeLessThan(MIN_DISTINCT_TERMS);

    const plan = planImport([research, personal], 'anthropic', '2026-08-25T23:00:00Z');
    expect(plan.counts.total).toBe(2);
    expect(plan.counts.indexed).toBe(1);
    // archives carry full text (Private side)…
    expect(plan.archives.some((a) => a.content.includes('SECRET-BODY-TOKEN'))).toBe(true);
    expect(plan.archives.every((a) => a.path.startsWith('Private/Archive/anthropic/'))).toBe(true);
    // …stubs and report never do (allowlisted side is content-free)
    for (const s of [...plan.stubs, plan.report]) {
      expect(s.content).not.toContain('SECRET-BODY-TOKEN');
      expect(s.content).not.toContain('what should I cook');
    }
    expect(plan.stubs[0].path.startsWith('Notes/Archive index/')).toBe(true);
    expect(plan.stubs[0].content).toContain('Private/Archive/anthropic/');
  });

  it('deduplicates colliding paths within a plan', () => {
    const dup: RawConvo = {
      title: 'Same title',
      dateIso: '2026-08-25T12:00:00Z',
      turns: [{ who: 'You', text: 'x' }],
    };
    const plan = planImport([dup, dup, dup], 'openai', '2026-08-25T23:00:00Z');
    const paths = plan.archives.map((a) => a.path);
    expect(new Set(paths).size).toBe(3);
  });

  it('report lists forgotten threads with rare topics', () => {
    const mk = (title: string, text: string): RawConvo => ({
      title,
      dateIso: '2026-08-25T12:00:00Z',
      turns: [{ who: 'You', text }],
    });
    const common = 'zeta spectral eigenvalue';
    const plan = planImport(
      [
        mk('Common A', common), mk('Common B', common), mk('Common C', common),
        mk('One-off idea', common + ' verblunsky'),
      ],
      'anthropic',
      '2026-08-25T23:00:00Z',
    );
    expect(plan.counts.forgotten).toBe(1);
    expect(plan.report.content).toContain('One-off idea');
    expect(plan.report.content).toContain('verblunsky');
  });
});

describe('structuralMap', () => {
  it('prints types, never string values', () => {
    const m = structuralMap({ token: 'super-secret-value', n: 3, arr: [1, 2] });
    expect(m).toContain('token: string');
    expect(m).toContain('arr: array[2]');
    expect(m).not.toContain('super-secret-value');
  });
});
