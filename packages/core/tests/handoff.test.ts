import { describe, it, expect } from 'vitest';
import { buildHandoff, listVendors, VENDOR_CAPABILITIES, type VendorId } from '../src/handoff';

describe('buildHandoff — prefill vendors', () => {
  it('chatgpt: encodes the prompt into the URL', () => {
    const plan = buildHandoff('chatgpt', 'compare A & B?');
    expect(plan.method).toBe('url_prefill');
    expect(plan.url).toBe('https://chatgpt.com/?q=compare%20A%20%26%20B%3F');
    expect(plan.clipboardText).toBeNull();
  });

  it('claude: uses /new with q parameter', () => {
    const plan = buildHandoff('claude', 'hello world');
    expect(plan.url).toBe('https://claude.ai/new?q=hello%20world');
  });

  it('multi-line prompts survive encoding round-trip', () => {
    const prompt = 'line one\n\nTo be clear: I want a comparison.';
    const plan = buildHandoff('grok', prompt);
    const q = new URL(plan.url).searchParams.get('q');
    expect(q).toBe(prompt);
  });
});

describe('buildHandoff — clipboard fallback vendors', () => {
  for (const vendor of ['gemini', 'copilot'] as VendorId[]) {
    it(`${vendor}: falls back to clipboard with home URL`, () => {
      const plan = buildHandoff(vendor, 'my prompt');
      expect(plan.method).toBe('clipboard');
      expect(plan.clipboardText).toBe('my prompt');
      expect(plan.url).toBe(VENDOR_CAPABILITIES[vendor].homeUrl);
      expect(plan.instructions).toMatch(/paste/i);
    });
  }
});

describe('capability table integrity', () => {
  it('every vendor has a verification date and notes (claims discipline)', () => {
    for (const cap of Object.values(VENDOR_CAPABILITIES)) {
      expect(cap.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cap.notes.length).toBeGreaterThan(10);
    }
  });

  it('prefill vendors have templates containing {q}; clipboard vendors have none', () => {
    for (const cap of Object.values(VENDOR_CAPABILITIES)) {
      if (cap.method === 'url_prefill') expect(cap.prefillTemplate).toContain('{q}');
      else expect(cap.prefillTemplate).toBeNull();
    }
  });

  it('listVendors returns prefill-capable vendors first', () => {
    const list = listVendors();
    expect(list).toHaveLength(6);
    const firstClipboard = list.findIndex((v) => v.method === 'clipboard');
    const lastPrefill = list.map((v) => v.method).lastIndexOf('url_prefill');
    expect(lastPrefill).toBeLessThan(firstClipboard);
  });

  it('unknown vendor throws', () => {
    expect(() => buildHandoff('llamacpp' as VendorId, 'x')).toThrow(/Unknown vendor/);
  });
});
