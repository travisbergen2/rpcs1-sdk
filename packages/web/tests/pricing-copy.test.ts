import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DONATIONS_LIVE, SUPPORT_URL } from '../lib/flags';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
const pricing = read('app/pricing/page.tsx');
const institutions = read('app/institutions/page.tsx');

describe('pricing page — the free-for-people model (spec §3/§4)', () => {
  it('leads with the model in one line', () => {
    expect(pricing).toContain('Free for people. Licensed for organizations.');
  });
  it('consumer tiers are retired — the ratchet', () => {
    // No individual subscription pricing may reappear on this page.
    expect(pricing).not.toMatch(/\$9<|\$9\/mo|\$79|Founding supporter|tier=indie|tier=founding/);
  });
  it('keeps the diagnostic as organizations-side information — never a funnel (the marketing-cut ratchet)', () => {
    // The written diagnostic stays named on the organizations side…
    expect(pricing).toMatch(/written agent diagnostic/i);
    // …but no checkout funnel, seat-staging, or founding-rate pitch may
    // reappear on this page (business-plan decision, 2026-08-25).
    expect(pricing).not.toMatch(/tier=diagnostic|first 3 free|founding rate|\$99|Claim a free|Skip the queue/i);
  });
  it('links the institutions page', () => {
    expect(pricing).toContain('href="/institutions"');
  });
  it('names the no-ads / no-data-selling posture', () => {
    expect(pricing).toContain('No ads, ever');
    expect(pricing).toContain('No selling data, ever');
  });
});

describe('institutions page — accessibility-procurement framing', () => {
  it('speaks the buyer’s compliance vocabulary', () => {
    expect(institutions).toMatch(/ADA/);
    expect(institutions).toMatch(/Section 508/);
    expect(institutions).toMatch(/FERPA/);
  });
  it('carries the disclosure law as a product fact', () => {
    expect(institutions).toMatch(/every piece of text that leaves a machine/i);
  });
  it('individuals-never-pay is stated', () => {
    expect(institutions).toMatch(/individuals never pay/i);
  });
});

describe('naming rule — no mechanism vocabulary on consumer surfaces', () => {
  // Internal acronyms/mechanism names must not appear in visible copy on
  // these two pages (developer docs are one click deep, where they belong).
  const MECHANISM = /RPCS-1|\bTI\b|\bSG\b|\bFT\b|\bUE\b|\bAR\b|\bMCP\b|CUSUM|receiver primitive/;
  it('pricing page is clean', () => {
    expect(pricing).not.toMatch(MECHANISM);
  });
  it('institutions page is clean', () => {
    expect(institutions).not.toMatch(MECHANISM);
  });
});

describe('donation rail — dormant by law until the gates clear (spec §7)', () => {
  it('the flag is OFF and no support URL exists yet', () => {
    expect(DONATIONS_LIVE).toBe(false);
    expect(SUPPORT_URL).toBe('');
  });
  it('the pricing page mounts the rail so live-day needs no page change', () => {
    expect(pricing).toContain('<SupportLink />');
  });
});
