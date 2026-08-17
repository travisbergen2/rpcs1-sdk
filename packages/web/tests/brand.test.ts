import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Brand token tests.
 *
 * BRAND_NAME is read from process.env at module load, so env-override tests
 * reset the module registry and re-import with a stubbed env.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('brand token', () => {
  it('defaults to Explicit Formula when no env override is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_BRAND_NAME', '');
    vi.resetModules();
    const { BRAND_NAME } = await import('../lib/brand');
    expect(BRAND_NAME).toBe('Explicit Formula');
  });

  it('is overridable via NEXT_PUBLIC_BRAND_NAME (one-line rename)', async () => {
    vi.stubEnv('NEXT_PUBLIC_BRAND_NAME', 'Test Brand');
    vi.resetModules();
    const { BRAND_NAME } = await import('../lib/brand');
    expect(BRAND_NAME).toBe('Test Brand');
  });

  it('exposes non-empty tagline, promise, and powered-by constants', async () => {
    const { BRAND_TAGLINE, BRAND_PROMISE, POWERED_BY } = await import(
      '../lib/brand'
    );
    expect(BRAND_TAGLINE.length).toBeGreaterThan(0);
    expect(BRAND_PROMISE.length).toBeGreaterThan(0);
    expect(POWERED_BY).toBe('RPCS-1');
  });
});

describe('brandLines (sticker wordmark splitter)', () => {
  it('splits a two-word name into two lines', async () => {
    const { brandLines } = await import('../lib/brand');
    expect(brandLines('Explicit Formula')).toEqual(['Explicit', 'Formula']);
  });

  it('keeps up to three words as one line each', async () => {
    const { brandLines } = await import('../lib/brand');
    expect(brandLines('One Two Three')).toEqual(['One', 'Two', 'Three']);
  });

  it('collapses names longer than three words to two lines', async () => {
    const { brandLines } = await import('../lib/brand');
    expect(brandLines('A Very Long Brand Name')).toEqual([
      'A Very Long Brand',
      'Name',
    ]);
  });

  it('never returns empty output', async () => {
    const { brandLines } = await import('../lib/brand');
    expect(brandLines('   ').length).toBeGreaterThan(0);
  });
});
