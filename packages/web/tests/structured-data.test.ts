import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_NAME } from '../lib/brand';
import { FAQ_ITEMS } from '../lib/faq';
import {
  AUTHOR,
  SITE_DESCRIPTION,
  SITE_URL,
  buildFaqPage,
  buildSiteGraph,
  serializeJsonLd,
  type FaqItem,
} from '../lib/structured-data';

const APP = 'https://explicitformula.com';
const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

type Node = Record<string, unknown> & { '@type': string; '@id': string };

function nodes(appUrl = APP): Node[] {
  return buildSiteGraph(appUrl)['@graph'] as unknown as Node[];
}

describe('site graph (JSON-LD)', () => {
  it('declares the schema.org context and exactly one Person, WebSite and SoftwareApplication', () => {
    const g = buildSiteGraph(APP);
    expect(g['@context']).toBe('https://schema.org');
    expect(nodes().map((n) => n['@type']).sort()).toEqual(['Person', 'SoftwareApplication', 'WebSite']);
  });

  it('names the software after the brand and reuses the shared site description', () => {
    const app = nodes().find((n) => n['@type'] === 'SoftwareApplication')!;
    const site = nodes().find((n) => n['@type'] === 'WebSite')!;
    expect(app.name).toBe(BRAND_NAME);
    expect(site.name).toBe(BRAND_NAME);
    expect(app.description).toBe(SITE_DESCRIPTION);
    expect(site.description).toBe(SITE_DESCRIPTION);
  });

  it('roots every @id and url in the app origin, with or without a trailing slash', () => {
    for (const base of [APP, `${APP}/`, `${APP}//`]) {
      for (const n of nodes(base)) {
        expect(n['@id'].startsWith(`${APP}/#`), n['@id']).toBe(true);
        if (typeof n.url === 'string' && n['@type'] !== 'Person') {
          expect(n.url).toBe(`${APP}/`);
        }
      }
    }
  });

  it('links the website and the software to the same author node', () => {
    const person = nodes().find((n) => n['@type'] === 'Person')!;
    const site = nodes().find((n) => n['@type'] === 'WebSite')!;
    const app = nodes().find((n) => n['@type'] === 'SoftwareApplication')!;
    expect(person.name).toBe(AUTHOR.name);
    expect((site.publisher as { '@id': string })['@id']).toBe(person['@id']);
    expect((app.author as { '@id': string })['@id']).toBe(person['@id']);
  });

  it('states the individual price as zero and sends organizations to the pricing page — no prose offer', () => {
    const app = nodes().find((n) => n['@type'] === 'SoftwareApplication')!;
    const offer = app.offers as Record<string, string>;
    expect(app.isAccessibleForFree).toBe(true);
    expect(offer.price).toBe('0');
    expect(offer.priceCurrency).toBe('USD');
    expect(offer.url).toBe(`${APP}/pricing`);
    // Prices and tiers render from a single source (the pricing page); the
    // graph carries pointers, never sentences about the offer.
    expect(JSON.stringify(app)).not.toMatch(/\$\d|\btier\b|founding/i);
  });

  it('points help and terms at the docs and terms pages', () => {
    const app = nodes().find((n) => n['@type'] === 'SoftwareApplication')!;
    expect((app.softwareHelp as { url: string }).url).toBe(`${APP}/docs`);
    expect(app.termsOfService).toBe(`${APP}/terms`);
  });

  it('SITE_URL is an absolute https origin (the fallback is the mechanism home)', () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/);
  });
});

describe('FAQPage builder', () => {
  const items: FaqItem[] = [
    { q: 'What is this?', a: 'A check that shows the readings a message forks into.' },
    { q: 'Does text leave my computer?', a: 'The homepage check sends nothing.', href: '/privacy', label: 'Privacy' },
  ];

  it('emits one Question with an acceptedAnswer per item, in order, anchored to the page', () => {
    const faq = buildFaqPage(APP, '/docs', items);
    expect(faq['@type']).toBe('FAQPage');
    expect(faq['@id']).toBe(`${APP}/docs#questions`);
    expect(faq.mainEntity).toHaveLength(items.length);
    faq.mainEntity.forEach((q, i) => {
      expect(q['@type']).toBe('Question');
      expect(q.name).toBe(items[i].q);
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(q.acceptedAnswer.text).toBe(items[i].a);
    });
  });

  it('keeps the link fields out of the schema (they are page furniture, not answer text)', () => {
    const text = JSON.stringify(buildFaqPage(APP, '/docs', items));
    expect(text).not.toMatch(/href|label|\/privacy/);
  });
});

describe('FAQ data (rendered on /docs and emitted as FAQPage)', () => {
  it('has at least five items with unique, non-empty questions', () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);
    const qs = FAQ_ITEMS.map((i) => i.q.trim());
    expect(qs.every((q) => q.length > 0 && q.endsWith('?'))).toBe(true);
    expect(new Set(qs).size).toBe(qs.length);
  });

  it('answers are plain text — no markup, no prices — and short enough to be quoted whole', () => {
    for (const item of FAQ_ITEMS) {
      expect(item.a.trim().length, item.q).toBeGreaterThan(0);
      expect(item.a, item.q).not.toMatch(/[<>]/);
      expect(item.a, item.q).not.toMatch(/\$\d/);
      expect(item.a.length, item.q).toBeLessThanOrEqual(480);
    }
  });

  it('every link points at a page that exists in the app, and carries a label', () => {
    for (const item of FAQ_ITEMS) {
      if (!item.href) continue;
      expect(item.label, item.href).toBeTruthy();
      const page = item.href === '/' ? 'app/page.tsx' : join('app', item.href.replace(/^\//, ''), 'page.tsx');
      expect(existsSync(join(__dirname, '..', page)), `${item.href} → ${page}`).toBe(true);
    }
  });

  it('never claims the evidence covers human readers (E-INT-1 is design-stage)', () => {
    const all = FAQ_ITEMS.map((i) => i.a).join(' ');
    expect(all).not.toMatch(/research-backed|proven|clinically|validated on humans/i);
  });
});

describe('the pages emit the schema from the shared module (drift guards)', () => {
  it('the root layout renders the site graph through the serializer', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/buildSiteGraph\(SITE_URL\)/);
    expect(layout).toMatch(/serializeJsonLd\(/);
    expect(layout).toMatch(/application\/ld\+json/);
    // The description has one source now.
    expect(layout).toMatch(/description: SITE_DESCRIPTION/);
  });

  it('the docs page renders the FAQ from FAQ_ITEMS and emits FAQPage from the same array', () => {
    const docs = read('app/docs/page.tsx');
    expect(docs).toMatch(/FAQ_ITEMS\.map\(/);
    expect(docs).toMatch(/buildFaqPage\(SITE_URL, '\/docs', FAQ_ITEMS\)/);
    expect(docs).toMatch(/application\/ld\+json/);
    expect(docs).toMatch(/id="questions"/);
  });
});

describe('serializeJsonLd', () => {
  it('escapes the characters that could break out of a <script> and round-trips through JSON.parse', () => {
    const data = { a: '</script><img src=x onerror=alert(1)>', b: 'fish & chips', c: 1 };
    const out = serializeJsonLd(data);
    expect(out).not.toMatch(/[<>&]/);
    expect(out).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(out)).toEqual(data);
  });

  it('serializes the real site graph and FAQ without markup characters', () => {
    const graph = serializeJsonLd(buildSiteGraph(APP));
    const faq = serializeJsonLd(buildFaqPage(APP, '/docs', FAQ_ITEMS));
    expect(graph).not.toMatch(/[<>]/);
    expect(faq).not.toMatch(/[<>]/);
    expect(JSON.parse(graph)['@graph']).toHaveLength(3);
    expect(JSON.parse(faq).mainEntity).toHaveLength(FAQ_ITEMS.length);
  });
});
