import { describe, it, expect } from 'vitest';
import { GatewayBackend } from '../src/perception-gateway';
import { avoidReadingsBlock, MockBackend } from '../src/perception';
import { interpretWithModel } from '../src/translator';

const TOOL_REPLY = {
  choices: [{ message: { tool_calls: [{ function: { name: 'report_perception', arguments: JSON.stringify({
    readings: [{ label: 'a', paraphrase: 'Reading A', interpConf: 0.6, userEvid: 0.5, epistemic: 0.5, narrative: 0.5, semGap: 0.3, transInteg: 0.8 }],
    entities: [], intents: [{ type: 'general', confidence: 0.6 }], canonicalTranslation: 'x'
  }) } }] } }]
};

function fakeFetch(capture: { body?: string }): typeof fetch {
  return (async (_url: any, init: any) => {
    capture.body = init.body;
    return { ok: true, status: 200, json: async () => TOOL_REPLY } as Response;
  }) as typeof fetch;
}

describe('G5 — rejected readings reach the perception prompt', () => {
  it('avoidReadingsBlock formats and caps the rejected list', () => {
    expect(avoidReadingsBlock()).toBe('');
    expect(avoidReadingsBlock({ avoidReadings: [] })).toBe('');
    const block = avoidReadingsBlock({ avoidReadings: ['Compare A and B', 'Pick one'] });
    expect(block).toContain('REJECTED');
    expect(block).toContain('[rejected 1] Compare A and B');
    expect(block).toContain('do not rephrase them');
    const many = Array.from({ length: 20 }, (_, i) => 'R' + i);
    expect(avoidReadingsBlock({ avoidReadings: many })).not.toContain('R12');
  });

  it('GatewayBackend embeds the avoid block in the user message', async () => {
    const capture: { body?: string } = {};
    const be = new GatewayBackend({ apiKey: 'k', fetchImpl: fakeFetch(capture) });
    await be.perceive('some text', undefined, { avoidReadings: ['Compare A and B'] });
    expect(capture.body).toContain('[rejected 1] Compare A and B');
    // and absent when no options given
    await be.perceive('some text');
    expect(capture.body).not.toContain('[rejected 1]');
  });

  it('interpretWithModel plumbs avoidReadings to the backend', async () => {
    let got: string[] | undefined;
    const mock = new MockBackend({
      readings: [{ label: 'a', paraphrase: 'Reading A', interpConf: 0.6, userEvid: 0.5, epistemic: 0.5, narrative: 0.5, semGap: 0.3, transInteg: 0.8 }],
      entities: [], intents: [{ type: 'general', confidence: 0.6 }], canonicalTranslation: 'x'
    });
    const orig = mock.perceive.bind(mock);
    mock.perceive = async (t: string, c?: string[], o?: { avoidReadings?: string[] }) => {
      got = o?.avoidReadings;
      return orig(t, c, o);
    };
    await interpretWithModel('hello there friend', mock, { avoidReadings: ['Old reading'] });
    expect(got).toEqual(['Old reading']);
  });
});
