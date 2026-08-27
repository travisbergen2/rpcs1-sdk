import { describe, it, expect } from 'vitest';
import { planTopicWiring, parseStubTerms, TOPIC_LABELS } from '../src/topic-wiring.js';

const stub = (name: string, terms: string) => ({
  path: `Notes/Archive index/${name}.md`,
  content: `---\nkind: archive-index\ndate: 2026-08-25T12:00:00Z\naliases: [x]\n---\n\n# ${name}\n\nA conversation.\n\n**Topics matched:** ${terms}\n`,
});

describe('parseStubTerms', () => {
  it('parses, dedupes, and applies stem labels', () => {
    expect(parseStubTerms(stub('a', 'zeta, riemann, zeta, preregist').content))
      .toEqual(['zeta', 'riemann', TOPIC_LABELS['preregist']]);
  });
  it('returns [] without a Topics matched line', () => {
    expect(parseStubTerms('# no line here')).toEqual([]);
  });
});

describe('planTopicWiring', () => {
  it('creates hubs only for terms with ≥2 members', () => {
    const plan = planTopicWiring([stub('a', 'zeta, riemann'), stub('b', 'zeta, obsidian')]);
    expect(plan.hubs.map((h) => h.path)).toEqual(['Notes/Topics/zeta.md']);
    expect(plan.counts.terms).toBe(3);
  });
  it('hub lists member wikilinks with titles and dates', () => {
    const plan = planTopicWiring([stub('a', 'zeta'), stub('b', 'zeta')]);
    expect(plan.hubs[0].content).toContain('[[Notes/Archive index/a|a (2026-08-25)]]');
    expect(plan.hubs[0].content).toContain('(2)');
  });
  it('patches append one Topics line and are idempotent', () => {
    const first = planTopicWiring([stub('a', 'zeta, riemann'), stub('b', 'zeta')]);
    expect(first.patches.length).toBe(2);
    expect(first.patches[0].content).toContain('**Topics:** [[Notes/Topics/zeta|zeta]], [[Notes/Topics/riemann|riemann]]');
    const second = planTopicWiring(first.patches.map((p) => ({ path: p.path, content: p.content })));
    expect(second.patches.length).toBe(0);
    expect(second.hubs.length).toBe(1);
  });
  it('merged stems share one hub', () => {
    const plan = planTopicWiring([stub('a', 'preregist, zeta'), stub('b', 'pre-regist, zeta')]);
    expect(plan.hubs.map((h) => h.path)).toContain('Notes/Topics/preregistration.md');
  });
});
