/**
 * Questions people actually ask, answered in plain text from the pages that
 * hold the facts. Rendered on /docs and emitted as FAQPage structured data
 * from this same array, so the visible answers and the machine-readable ones
 * cannot drift.
 *
 * House rules: every answer points at the page that owns the fact; no answer
 * states a result the record does not carry (the research page grades the
 * evidence); prices live on the pricing page, not here.
 */
import type { FaqItem } from './structured-data';

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    q: 'What does Explicit Formula do?',
    a: 'It shows the different ways a piece of text can be read before you send it, so you can pick the reading you meant and send the version that lands. The check on the homepage runs in your browser and sends nothing.',
    href: '/',
    label: 'Try it on the homepage',
  },
  {
    q: 'What is RPCS-1?',
    a: 'The measurement underneath the product. RPCS-1 describes a reader with five primitives — Temporal Integration (TI), Signal Gain (SG), Filter Threshold (FT), Update Elasticity (UE) and Ambiguity Resolution (AR) — and applies derived receiver laws to turn a profile into concrete runtime settings for an AI agent.',
    href: '/docs/primitives',
    label: 'The five primitives',
  },
  {
    q: 'Does my text leave my computer?',
    a: 'The homepage check sends nothing. The browser extension sends the text being checked when you pause typing; the Loop plugin sends the panel text and, only if you opt in, small snippets from your notes. No text is stored on the server. The privacy page lists exactly what is sent, where it goes and what is kept.',
    href: '/privacy',
    label: 'Privacy',
  },
  {
    q: 'What does it cost?',
    a: 'Free for people. Licensed for organizations — site licenses, written privacy commitments, integration help and a written agent diagnostic. The pricing page has the details.',
    href: '/pricing',
    label: 'Pricing',
  },
  {
    q: 'How do I connect it to my AI tools?',
    a: 'Through the public, anonymous, read-only MCP server, which needs no API key or account, or through the Python SDK. The MCP integration guide covers the endpoint and the first call; Getting started covers the SDK install.',
    href: '/docs/mcp',
    label: 'MCP integration guide',
  },
  {
    q: 'What are the usage limits?',
    a: 'The web tuner allows 10 recommendations per hour. The Python SDK allows 5 free calls per day.',
    href: '/tuner',
    label: 'Run the tuner',
  },
  {
    q: 'What evidence is behind the recommendations?',
    a: 'Registered tests with the pass criteria frozen before any data was collected, published together with what failed and what was withdrawn. The tests measure how AI models follow instructions; they are not studies of human readers. The research page carries each result at its grade.',
    href: '/rd',
    label: 'Research and results',
  },
];
