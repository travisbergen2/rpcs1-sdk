import { describe, expect, it } from 'vitest';
import { LABS, LAB_GROUPS } from '../lib/labs';

describe('labs registry', () => {
  it('has unique hrefs (no route listed twice)', () => {
    const hrefs = LABS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('uses internal routes only (every href starts with /)', () => {
    for (const lab of LABS) {
      expect(lab.href.startsWith('/')).toBe(true);
    }
  });

  it('has a non-empty name and description on every entry', () => {
    for (const lab of LABS) {
      expect(lab.name.trim().length).toBeGreaterThan(0);
      expect(lab.desc.trim().length).toBeGreaterThan(0);
    }
  });

  it('assigns every entry to a declared group', () => {
    for (const lab of LABS) {
      expect(LAB_GROUPS).toContain(lab.group);
    }
  });

  it('renders every declared group (no empty sections on /labs)', () => {
    for (const group of LAB_GROUPS) {
      expect(LABS.some((l) => l.group === group)).toBe(true);
    }
  });
});
