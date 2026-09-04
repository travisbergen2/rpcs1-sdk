import type { ProfileKey } from '@/lib/profiles';

/**
 * Register-variant copy for the homepage instrument's info bubble.
 *
 * DESIGN RULE (inherited from lib/profiles.ts, binding): the register varies,
 * the facts never do. Offer content (prices, tiers, guarantees) must never
 * appear here — tests/landing-copy.test.ts enforces this structurally.
 *
 * Why this file exists (2026-08-18): the #81 landing rewrite stopped
 * consuming the reading profile, which left the "Reading as" pill in the nav
 * visibly dead on the front page — a control that does nothing looks broken.
 * Since 2026-09-04 the homepage is the instrument itself; this copy lives in
 * its "What is this doing?" bubble, so the pill still has a job: same facts,
 * read your way.
 */
export interface LandingCopy {
  /** The one-paragraph answer to "what is this doing?" */
  sub: string;
  /** Bodies for the three beats (titles are static in the component). */
  beats: [string, string, string];
  /** What the five dials are and what they turn into. */
  dials: string;
}

export const LANDING_COPY: Record<ProfileKey, LandingCopy> = {
  technical: {
    sub: 'Deterministic fork detection runs on every keystroke, in your browser — zero API calls. If your text supports more than one reading, each fork surfaces with its exact span, the readings it supports, and a one-line clarifier that locks the one you meant. Clean input renders nothing.',
    beats: [
      'No format constraints — raw, fragmented input is the expected case, not an error.',
      'Detection is structural and deterministic: identical input, identical output. Only real forks surface; clean prompts stay silent by contract.',
      'Pick a reading and its clarifier is appended; one tap opens your own model app with the previewed text filled in. The call is never proxied.',
    ],
    dials:
      'The five sliders are the receiver profile R̂ — the five RPCS-1 primitives on [0,100]. A fixed band rule (below 40 / 40–60 / above 60) selects one instruction clause per dial; the paragraph is produced by the same function the engine uses everywhere and is prepended to your message on send. Identical dials, identical paragraph. Values persist in this browser only and leave it only inside a message you send.',
  },
  executive: {
    sub: 'Every "that’s not what I meant" is a wasted round trip. This catches the misread before it ships: see how your words will land, pick the meaning you intended, send once.',
    beats: [
      'Paste as-is. No setup, no training, nothing to configure.',
      'Where a message can go two ways, you see it before the receiver does — and you choose.',
      'One tap sends the clear version through your own AI. Fewer round trips, same tools.',
    ],
    dials:
      'Five sliders set how you want answers delivered — pace, tone, directness, flexibility, and what to do when your words could mean two things. They become a short standing instruction that travels with your message, so every model you use answers you the same way.',
  },
  plain: {
    sub: 'Words can land two different ways. The left box is what you typed; the right box is what the AI will actually get. If something could be taken two ways, you see it before you send — and you pick.',
    beats: [
      'Type like you’d say it out loud. Messy is fine.',
      'If something could be taken two ways, it gets pointed out — only when it’s real.',
      'Pick your meaning and send it from your own AI app, like always.',
    ],
    dials:
      'The five sliders are about you: how fast to get to the point, how warm to be, whether to say things outright, whether to push back, and whether to ask or just pick when something is unclear. They turn into a few plain sentences that go along with your message.',
  },
  literal: {
    sub: 'Exact behavior: your text is checked in this browser tab; nothing is transmitted or stored by this site. If a sentence supports more than one reading, every reading is listed. If it supports exactly one, nothing appears. The right pane shows the exact text that will be handed to the AI app you choose.',
    beats: [
      'Input has no required format. Fragments are processed as written.',
      'Each detected fork names the exact words at issue and lists the readings they support — nothing more, nothing invented.',
      'Selecting a reading appends one clarifying sentence. The hand-off fills your chosen AI app with the exact previewed text; this site does not send it.',
    ],
    dials:
      'Five sliders, each 0 to 100. Each slider selects one of three fixed sentences by its range: below 40, 40 to 60, above 60. The five selected sentences are joined into one paragraph and placed before your message when you send. The same slider values always produce the same paragraph. Slider values are kept in this browser and leave it only inside a message you choose to send.',
  },
};
