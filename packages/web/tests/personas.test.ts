import { describe, expect, it } from 'vitest';
import { PERSONAS, getPersona, validatePersona } from '../lib/personas';
import { rewriteForProfile, deriveRenderingDirectives } from '@rpcs1/core';

describe('receiver personas', () => {
  it('has at least four personas with unique ids and titles', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    expect(new Set(PERSONAS.map((p) => p.title)).size).toBe(PERSONAS.length);
  });

  it('every persona passes validation (vector range + grade consistency)', () => {
    for (const p of PERSONAS) {
      expect(validatePersona(p)).toEqual([]);
    }
  });

  it('claim discipline: provisional cards carry no tested version; measured cards must', () => {
    for (const p of PERSONAS) {
      expect(['provisional', 'measured']).toContain(p.grade);
      if (p.grade === 'provisional') {
        expect(p.testedVersion).toBeNull();
        expect(p.measuredDate).toBeNull();
      } else {
        expect(p.testedVersion).toBeTruthy();
        expect(p.measuredDate).toBeTruthy();
      }
    }
  });

  it('personas are behaviorally distinct: no two identical directive sets', () => {
    const seen = new Map<string, string>();
    for (const p of PERSONAS) {
      const { why: _why, ...modes } = deriveRenderingDirectives(p.profile);
      const d = JSON.stringify(modes);
      const clash = seen.get(d);
      expect(clash, `${p.id} derives identical directives to ${clash}`).toBeUndefined();
      seen.set(d, p.id);
    }
  });

  it('every persona vector feeds rewriteForProfile without error and yields instructions', () => {
    for (const p of PERSONAS) {
      const out = rewriteForProfile('word salad example: make the thing do the stuff better', p.profile);
      expect(out.style).toBe('profile');
      expect(out.rewrite_instructions.length).toBeGreaterThan(40);
      expect(out.style_description).toContain(`TI${p.profile.TI}`);
    }
  });

  it('getPersona resolves ids and rejects unknowns', () => {
    expect(getPersona(PERSONAS[0].id)?.title).toBe(PERSONAS[0].title);
    expect(getPersona('nope')).toBeUndefined();
  });

  it('the Literal Reader clarifies; the Fast Committer commits (directive sanity)', () => {
    const literal = getPersona('literal-reader');
    const committer = getPersona('fast-committer');
    expect(literal && committer).toBeTruthy();
    if (!literal || !committer) return;
    expect(deriveRenderingDirectives(literal.profile).ambiguity).toBe('clarify');
    expect(deriveRenderingDirectives(committer.profile).ambiguity).toBe('commit');
    expect(deriveRenderingDirectives(literal.profile).explicitness).toBe('explicit_literal');
  });
});
