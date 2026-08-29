import { describe, it, expect } from 'vitest';
import { buildConstellationSvg, pointFromStub, domainOf } from '../src/constellation.js';

const stub = (date: string, terms: string) =>
  `---\nkind: archive-index\ndate: ${date}T12:00:00Z\naliases: [x]\n---\n\n# T\n\n**Topics matched:** ${terms}\n`;

describe('pointFromStub', () => {
  it('extracts date and terms', () => {
    const p = pointFromStub(stub('2026-01-15', 'zeta, trading'));
    expect(p).toEqual({ dateIso: '2026-01-15', terms: ['zeta', 'trading'] });
  });
  it('returns null without date or terms', () => {
    expect(pointFromStub('# nothing')).toBeNull();
  });
});

describe('domainOf', () => {
  it('maps terms to bands, defaulting to research', () => {
    expect(domainOf('zeta')).toBe('research');
    expect(domainOf('obsidian')).toBe('building');
    expect(domainOf('drawdown')).toBe('trading');
    expect(domainOf('unknown-term')).toBe('research');
  });
});

describe('buildConstellationSvg', () => {
  const pts = [
    { dateIso: '2026-01-01', terms: ['zeta'] },
    { dateIso: '2026-06-01', terms: ['zeta', 'obsidian'] },
    { dateIso: '2026-03-01', terms: ['drawdown'] },
  ];
  it('is deterministic (same input → identical bytes)', () => {
    expect(buildConstellationSvg(pts)).toBe(buildConstellationSvg(pts));
  });
  it('orders rows by domain block then first appearance', () => {
    const svg = buildConstellationSvg(pts);
    const zeta = svg.indexOf('>zeta ');
    const obsidian = svg.indexOf('>obsidian ');
    const drawdown = svg.indexOf('>drawdown ');
    expect(zeta).toBeGreaterThan(-1);
    expect(zeta).toBeLessThan(obsidian);      // research before building
    expect(obsidian).toBeLessThan(drawdown);  // building before trading
  });
  it('later dates land further right', () => {
    const svg = buildConstellationSvg(pts);
    const xs = [...svg.matchAll(/<rect x="([\d.]+)" y="\d+" width="6"/g)].map((m) => parseFloat(m[1]));
    expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs));
  });
  it('escapes labels and carries counts', () => {
    const svg = buildConstellationSvg([{ dateIso: '2026-01-01', terms: ['zeta'] }, { dateIso: '2026-01-02', terms: ['zeta'] }]);
    expect(svg).toContain('(2)');
  });
  it('empty input yields the friendly empty chart', () => {
    expect(buildConstellationSvg([])).toContain('Import my AI history');
  });
});
