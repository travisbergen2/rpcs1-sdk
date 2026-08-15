import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hasCalibBypass, allowModelCall } from '../lib/gateway';

const KEY = 'test-calibration-key-0123456789abcdef';

function req(headers: Record<string, string> = {}): Request {
  return new Request('https://rpcs1.dev/api/translate', { method: 'POST', headers });
}

describe('hasCalibBypass', () => {
  const saved = process.env.RPCS1_CALIB_KEY;
  beforeEach(() => {
    process.env.RPCS1_CALIB_KEY = KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.RPCS1_CALIB_KEY;
    else process.env.RPCS1_CALIB_KEY = saved;
  });

  it('matching header grants bypass', () => {
    expect(hasCalibBypass(req({ 'x-rpcs1-calib': KEY }))).toBe(true);
  });

  it('wrong key of same length is rejected', () => {
    const wrong = 'x'.repeat(KEY.length);
    expect(hasCalibBypass(req({ 'x-rpcs1-calib': wrong }))).toBe(false);
  });

  it('wrong key of different length is rejected (no throw from timingSafeEqual)', () => {
    expect(hasCalibBypass(req({ 'x-rpcs1-calib': 'short' }))).toBe(false);
  });

  it('missing header is rejected', () => {
    expect(hasCalibBypass(req())).toBe(false);
  });

  it('unset env disables the path entirely, even with a header', () => {
    delete process.env.RPCS1_CALIB_KEY;
    expect(hasCalibBypass(req({ 'x-rpcs1-calib': '' }))).toBe(false);
    expect(hasCalibBypass(req({ 'x-rpcs1-calib': 'anything' }))).toBe(false);
  });

  it('empty env value disables the path (falsy key)', () => {
    process.env.RPCS1_CALIB_KEY = '';
    expect(hasCalibBypass(req({ 'x-rpcs1-calib': '' }))).toBe(false);
  });
});

describe('allowModelCall', () => {
  const saved = process.env.RPCS1_CALIB_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.RPCS1_CALIB_KEY;
    else process.env.RPCS1_CALIB_KEY = saved;
  });

  it('valid calibration header allows the call without touching the budget path', () => {
    process.env.RPCS1_CALIB_KEY = KEY;
    // Repeated calls all pass — a budget counter would eventually deny.
    for (let i = 0; i < 50; i++) {
      expect(allowModelCall(req({ 'x-rpcs1-calib': KEY }))).toBe(true);
    }
  });

  it('without the key it falls through to the daily budget (boolean either way)', () => {
    delete process.env.RPCS1_CALIB_KEY;
    const result = allowModelCall(req());
    expect(typeof result).toBe('boolean');
  });
});
