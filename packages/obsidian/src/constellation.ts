// ── P6 constellation (pure: no Obsidian imports — fully unit-testable) ────────
//
// "Draw my constellation": the archive rendered as a CHART, not a graph —
// position is meaning. x = when a conversation happened, y = which topic it
// touched (grouped research / building / trading, ordered by when each topic
// first entered the history), one square per conversation×topic. This is the
// coordinate view the graph view cannot be: force-directed layouts carry no
// positional information; this carries nothing else.
//
// Output is a deterministic SVG string (same input → identical bytes), which
// Obsidian renders inline. Regenerable; contains topic labels and dates only
// — never conversation content or titles.

import { parseStubTerms } from './topic-wiring.js';

export interface ConstellationPoint { dateIso: string; terms: string[] }

export const DOMAIN_PALETTE: Record<string, { color: string; terms: string[] }> = {
  research: {
    color: '#7eb6f6',
    terms: ['imm', 'rpcs', 'receiver', 'riemann', 'zeta', 'spectral', 'toeplitz', 'weil',
      'manifold', 'observer', 'entropy', 'eigenvalue', 'born rule', 'lorentzian',
      'yang-mills', 'mass gap', 'nyman', 'beurling', 'verblunsky', 'mertens',
      'theorem', 'lemma', 'conjecture', 'axiom', 'markov', 'stochastic',
      'preregistration', 'falsifiability', 'claim ledger', 'kill-gate',
      'e-lit', 'e-dyad', 'e-circ', 'e-tail', 'e-born', 'e-sol', 'e-comp', 'e-prop',
      'zenodo', 'latex'],
  },
  building: {
    color: '#e5c07b',
    terms: ['obsidian', 'mcp', 'second brain', 'explicit formula', 'tuner', 'translator',
      'nl2build', 'apk', 'sdk', 'npm', 'vercel', 'github',
      'temporal integration', 'signal gain', 'filter threshold', 'update elasticity',
      'ambiguity resolution', 'oscillation', 'overload', 'freeze'],
  },
  trading: {
    color: '#e06c75',
    terms: ['trading', 'xauusd', 'backtest', 'kelly', 'drawdown', 'prop firm',
      'tradelocker', 'aquafunded', 'walk-forward', 'sharpe'],
  },
};
const DOMAIN_ORDER = ['research', 'building', 'trading'];

export function domainOf(term: string): string {
  for (const [d, { terms }] of Object.entries(DOMAIN_PALETTE)) {
    if (terms.includes(term)) return d;
  }
  return 'research';
}

/** Extract (dateIso, terms) from an archive-index stub's content. */
export function pointFromStub(content: string): ConstellationPoint | null {
  const dm = /^date: (\d{4}-\d{2}-\d{2})/m.exec(content);
  const terms = parseStubTerms(content);
  if (!dm || !terms.length) return null;
  return { dateIso: dm[1], terms };
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DAY_MS = 86_400_000;
const parseDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Deterministic SVG. Layout constants are product constants. */
export function buildConstellationSvg(points: ConstellationPoint[]): string {
  if (!points.length) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="80">' +
      '<rect width="600" height="80" fill="#0d1017"/>' +
      '<text x="20" y="45" fill="#c8ccd4" font-size="14" font-family="sans-serif">' +
      'No archive stubs yet — run “Import my AI history”, then draw again.</text></svg>';
  }

  // first appearance per term → y ordering (domain block, then entry date)
  const first = new Map<string, number>();
  const count = new Map<string, number>();
  let minT = Infinity, maxT = -Infinity;
  for (const p of points) {
    const t = parseDay(p.dateIso);
    minT = Math.min(minT, t); maxT = Math.max(maxT, t);
    for (const term of p.terms) {
      if (!first.has(term) || t < first.get(term)!) first.set(term, t);
      count.set(term, (count.get(term) || 0) + 1);
    }
  }
  if (maxT === minT) maxT = minT + DAY_MS;
  const order = [...first.keys()].sort((a, b) => {
    const da = DOMAIN_ORDER.indexOf(domainOf(a)), db = DOMAIN_ORDER.indexOf(domainOf(b));
    return da - db || first.get(a)! - first.get(b)! || (a < b ? -1 : 1);
  });
  const yOf = new Map(order.map((t, i) => [t, i]));

  const left = 170, right = 40, top = 64, bottom = 46, rowH = 14, sq = 6;
  const plotW = 980, width = left + plotW + right, height = top + order.length * rowH + bottom;
  const xOf = (iso: string) => left + ((parseDay(iso) - minT) / (maxT - minT)) * (plotW - sq);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="sans-serif">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#0d1017"/>`);
  parts.push(`<text x="${left}" y="24" fill="#e6e6e6" font-size="15">The archive constellation — one square = one conversation touching one topic</text>`);
  parts.push(`<text x="${left}" y="42" fill="#8b90a0" font-size="11">position is meaning: x = when you thought it · y = the topic, ordered by when it first entered</text>`);

  // quarterly x ticks
  const start = new Date(minT), end = new Date(maxT);
  for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) {
    for (const m of [0, 3, 6, 9]) {
      const t = Date.UTC(y, m, 1);
      if (t < minT || t > maxT) continue;
      const x = left + ((t - minT) / (maxT - minT)) * (plotW - sq);
      parts.push(`<line x1="${x.toFixed(1)}" y1="${top - 6}" x2="${x.toFixed(1)}" y2="${height - bottom + 6}" stroke="#1a1f2a" stroke-width="1"/>`);
      parts.push(`<text x="${x.toFixed(1)}" y="${height - bottom + 22}" fill="#8b90a0" font-size="10" text-anchor="middle">${y}-${String(m + 1).padStart(2, '0')}</text>`);
    }
  }

  // rows + labels
  for (const term of order) {
    const y = top + yOf.get(term)! * rowH;
    const c = DOMAIN_PALETTE[domainOf(term)].color;
    parts.push(`<text x="${left - 8}" y="${y + sq + 2}" fill="#c8ccd4" font-size="9" text-anchor="end">${xmlEscape(term)} <tspan fill="#5a6070">(${count.get(term)})</tspan></text>`);
    parts.push(`<g fill="${c}" fill-opacity="0.88">`);
    const seen = new Set<string>();
    for (const p of points) {
      if (!p.terms.includes(term)) continue;
      const key = p.dateIso;
      if (seen.has(key)) continue; // one square per term per day keeps the SVG lean
      seen.add(key);
      parts.push(`<rect x="${xOf(p.dateIso).toFixed(1)}" y="${y}" width="${sq}" height="${sq}"/>`);
    }
    parts.push('</g>');
  }

  // legend
  let lx = left;
  for (const d of DOMAIN_ORDER) {
    parts.push(`<rect x="${lx}" y="${height - 18}" width="9" height="9" fill="${DOMAIN_PALETTE[d].color}"/>`);
    parts.push(`<text x="${lx + 14}" y="${height - 9}" fill="#c8ccd4" font-size="10">${d}</text>`);
    lx += 90;
  }
  parts.push('</svg>');
  return parts.join('\n');
}
