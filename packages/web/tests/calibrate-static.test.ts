import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTAKE_ITEMS } from '@rpcs1/core';

/**
 * /calibrate renders its five questions from core's static INTAKE_ITEMS, so
 * they are in the prerendered HTML — no post-hydration API round trip for the
 * first paint (the fix #24 was after, redone on the current page).
 */
const page = readFileSync(join(__dirname, '..', 'app', 'calibrate', 'page.tsx'), 'utf8');

describe('/calibrate — questions are static', () => {
  it('imports INTAKE_ITEMS from core and never fetches the item list on mount', () => {
    expect(page).toMatch(/import \{ INTAKE_ITEMS \} from '@rpcs1\/core'/);
    expect(page).not.toContain("api('intake', {})");
    expect(page).not.toContain('Loading questions');
    expect(page).not.toMatch(/useEffect/);
  });

  it('core exposes exactly one item per receiver primitive, each with 2–4 anchored options', () => {
    expect(INTAKE_ITEMS.map((i) => i.primitive)).toEqual(['TI', 'SG', 'FT', 'UE', 'AR']);
    for (const item of INTAKE_ITEMS) {
      expect(item.prompt.trim().length).toBeGreaterThan(0);
      expect(item.options.length).toBeGreaterThanOrEqual(2);
      expect(item.options.length).toBeLessThanOrEqual(4);
      for (const o of item.options) {
        expect(o.anchor).toBeGreaterThanOrEqual(0);
        expect(o.anchor).toBeLessThanOrEqual(100);
      }
    }
  });

  it('scoring still goes through the API (the static import covers the questions only)', () => {
    expect(page).toContain("api('intake', { answers })");
  });
});
