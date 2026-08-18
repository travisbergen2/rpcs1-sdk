import type { ProfileKey } from '@/lib/profiles';

/**
 * Register-variant copy for the one-box landing page.
 *
 * DESIGN RULE (inherited from lib/profiles.ts, binding): the register varies,
 * the facts never do. Offer content (prices, tiers, guarantees) must never
 * appear here — tests/landing-copy.test.ts enforces this structurally.
 *
 * Why this file exists (2026-08-18): the #81 landing rewrite stopped
 * consuming the reading profile, which left the "Reading as" pill in the nav
 * visibly dead on the front page — a control that does nothing looks broken.
 * The landing is the product's own demo: same facts, read your way.
 */
export interface LandingCopy {
  /** The paragraph under the hero promise. */
  sub: string;
  /** Bodies for the three how-it-works beats (titles are static). */
  beats: [string, string, string];
}

export const LANDING_COPY: Record<ProfileKey, LandingCopy> = {
  technical: {
    sub: 'Deterministic fork detection runs on every keystroke, in your browser — zero API calls. If your text supports more than one reading, each fork surfaces with its exact span, the readings it supports, and a one-line clarifier that locks the one you meant. Clean input renders nothing.',
    beats: [
      'No format constraints — raw, fragmented input is the expected case, not an error.',
      'Detection is structural and deterministic: identical input, identical output. Only real forks surface; clean prompts stay silent by contract.',
      'Pick a reading and its clarifier is appended; one tap opens your own model app with the clarified prompt filled in. The call is never proxied.',
    ],
  },
  executive: {
    sub: 'Every "that’s not what I meant" is a wasted round trip. This catches the misread before it ships: see how your words can land, pick the meaning you intended, send once.',
    beats: [
      'Paste as-is. No setup, no training, nothing to configure.',
      'Where a message can go two ways, you see it before the receiver does — and you choose.',
      'One tap sends the clear version through your own AI. Fewer round trips, same tools.',
    ],
  },
  plain: {
    sub: 'Words can land two different ways. The box shows you both before you hit send — you pick the one you meant, and that’s the one that goes.',
    beats: [
      'Type like you’d say it out loud. Messy is fine.',
      'If something could be taken two ways, it gets pointed out — only when it’s real.',
      'Pick your meaning and send it from your own AI app, like always.',
    ],
  },
  literal: {
    sub: 'Exact behavior: your text is checked in this browser tab; nothing is transmitted or stored by this site. If a sentence supports more than one reading, every reading is listed. If it supports exactly one, nothing appears.',
    beats: [
      'Input has no required format. Fragments are processed as written.',
      'Each detected fork names the exact words at issue and lists the readings they support — nothing more, nothing invented.',
      'Selecting a reading appends one clarifying sentence. The hand-off fills your chosen AI app with the exact final text; this site does not send it.',
    ],
  },
};
