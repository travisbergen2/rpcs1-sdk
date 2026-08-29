import { describe, expect, it, vi } from 'vitest';
import {
  CURRENT_ID,
  DRAFT_MAX_CHARS,
  makeDraftAutosaver,
  MAX_DRAFTS,
  MemoryDraftStore,
  saveCurrentDraft,
  saveOfflineDump,
} from '../lib/offline-drafts';

describe('saveCurrentDraft — rolling autosave draft', () => {
  it('saves under the fixed id and overwrites', async () => {
    const s = new MemoryDraftStore();
    await saveCurrentDraft(s, 'first version of a thought', 1000);
    await saveCurrentDraft(s, 'second version of a thought', 2000);
    const all = await s.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(CURRENT_ID);
    expect(all[0].text).toMatch(/^second/);
  });

  it('ignores trivially short text', async () => {
    const s = new MemoryDraftStore();
    await saveCurrentDraft(s, 'hi');
    expect(await s.list()).toHaveLength(0);
  });

  it('clips to the dump limit', async () => {
    const s = new MemoryDraftStore();
    await saveCurrentDraft(s, 'x'.repeat(DRAFT_MAX_CHARS + 500));
    expect((await s.list())[0].text).toHaveLength(DRAFT_MAX_CHARS);
  });
});

describe('saveOfflineDump — offline sends are never lost', () => {
  it('each offline send gets its own draft, newest first', async () => {
    const s = new MemoryDraftStore();
    await saveOfflineDump(s, 'dump one', 1000);
    await saveOfflineDump(s, 'dump two', 2000);
    const all = await s.list();
    expect(all.map((d) => d.text)).toEqual(['dump two', 'dump one']);
  });

  it('evicts oldest beyond the cap', async () => {
    const s = new MemoryDraftStore();
    for (let i = 0; i < MAX_DRAFTS + 5; i++) await saveOfflineDump(s, `dump ${i}`, 1000 + i);
    const all = await s.list();
    expect(all).toHaveLength(MAX_DRAFTS);
    expect(all[all.length - 1].text).toBe('dump 5'); // 0..4 evicted
  });

  it('ignores empty text', async () => {
    const s = new MemoryDraftStore();
    await saveOfflineDump(s, '   ');
    expect(await s.list()).toHaveLength(0);
  });
});

describe('makeDraftAutosaver — trailing debounce', () => {
  it('only the last text within the window is saved', async () => {
    vi.useFakeTimers();
    const s = new MemoryDraftStore();
    const save = makeDraftAutosaver(s, 800);
    save('typing in progress...');
    save('typing in progress... more');
    save('typing in progress... final form');
    await vi.advanceTimersByTimeAsync(799);
    expect(await s.list()).toHaveLength(0); // not yet
    await vi.advanceTimersByTimeAsync(1);
    const all = await s.list();
    expect(all).toHaveLength(1);
    expect(all[0].text).toMatch(/final form$/);
    vi.useRealTimers();
  });
});
