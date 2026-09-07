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
 * Since 2026-09-04 the homepage is the instrument itself; since 2026-09-07 the
 * instrument is one live conversation in two registers. This copy lives in
 * its "What is this doing?" bubble, so the pill still has a job: same facts,
 * read your way.
 *
 * The facts (every register must state them, in its own words):
 *   - two panes = two registers of one conversation; the model's pane is its
 *     context window made visible;
 *   - before answering, the model rewrites your message as the prompt it would
 *     write to itself; it streams live; you can stop, edit, or correct it;
 *     nothing runs until Go;
 *   - the reply appears in the model's words on its side and re-rendered in
 *     your words on yours (meaning preserved), aligned so you can check;
 *   - pressing Send/Correct/Go transmits your words, the conversation, and both
 *     boards to this site's server and on to the configured model; this site
 *     stores nothing; the transcript stays in this browser;
 *   - both boards are applied for real: yours shapes how replies are rendered
 *     to you; the model's sets the call's parameters and stance.
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
    sub: 'One conversation, two registers, side by side. Your pane holds your words. The model’s pane is its context window made visible: before it answers, the model rewrites your message as the prompt it would write to itself — streamed live, editable, correctable — and only the version you release with Go is run. Its reply lands in its pane verbatim; your pane receives the same reply re-rendered into your register by a second call whose instruction is meaning-preservation. Deterministic fork detection still runs on every keystroke, client-side, before anything is sent.',
    beats: [
      'Raw, fragmented input is the expected case. Fork detection underlines real ambiguity as you type — zero API calls until you press Send.',
      'On Send, the model streams its rewrite of your message: its reading, in its syntax, each assumption stated on an "Assuming:" line. Stop it, edit it in place, or type a correction and it re-derives; nothing runs until Go.',
      'The answer streams in the model’s words on its side and is re-rendered in your register on yours, using your board’s instruction and your own messages as the register sample. Rows are aligned; glance across to check fidelity.',
    ],
    dials:
      'Two fader banks, five channels each. Yours is the receiver profile R̂ — the five RPCS-1 primitives on [0,100]; a fixed band rule (below 40 / 40–60 / above 60) selects one instruction clause per channel, and that paragraph is the instruction for the re-rendering step, so every reply reaches you in your register. The model’s bank is the same five primitives read as an agent configuration and applied to the actual call: temperature and top_p from SG, max_tokens from TI, the stance sentences (from FT, TI, AR) in the system prompt; context, tool-use, and retry strategies are derived and shown but have no effect in a plain chat. Identical faders, identical parameters. Values persist in this browser only and leave it only inside a request you send.',
  },
  executive: {
    sub: 'Two windows, one conversation. Left: what you said, and every answer in your words. Right: what the model actually understood — written out before it acts, so you can fix a misread before it costs you a round trip — and its answer exactly as it wrote it.',
    beats: [
      'Say it as it comes. No setup, nothing to configure.',
      'Before answering, the model shows you what it heard. If it missed, correct it in one line — or press Go and let it run.',
      'Answers arrive in your way of speaking. The model’s original sits one glance to the right, row by row, so nothing is lost in the translation.',
    ],
    dials:
      'Two small mixing boards, both live. Yours sets how you want answers delivered — pace, tone, directness, flexibility, and what to do when your words could mean two things — and shapes how every reply is put to you. The model’s sets how it runs — how much it holds, how crisp or exploratory it is, how much it double-checks, how readily it retries, how fast it commits — and those settings are used on the actual call, not merely suggested.',
  },
  plain: {
    sub: 'Two boxes, one chat. The left box is you: what you typed, and the answers in your words. The right box is the AI: what it understood you to mean — shown before it answers, so you can say “no, I meant…” — and its answers in its own words.',
    beats: [
      'Type like you’d say it out loud. Messy is fine.',
      'It shows you what it heard first. If that’s off, tell it or fix the words yourself, then press Go.',
      'The answer comes back in your way of talking. Its exact words sit right beside it, so you can check.',
    ],
    dials:
      'Two sets of sliders, like a stereo equalizer, and both really do something here. Yours are about you: how fast to get to the point, how warm to be, whether to say things outright, whether to push back, and whether to ask or just pick when something is unclear — they shape how answers are put to you. The AI’s are about how it works: how much it remembers, how careful it is, how often it checks, and how quickly it decides — they are used when it runs. Your settings stay in this browser and go out only with a message you send.',
  },
  literal: {
    sub: 'Exact behavior: pressing Send transmits your text, the conversation so far, and both boards’ values to this site’s server, which forwards them to the configured model and streams the result back; this site stores none of it, and the transcript is kept in this browser only. The model first returns a rewrite of your message (its reading), shown on the right as it arrives. It runs only after you press Go, with your edits if any. Its reply is shown verbatim on the right and, on the left, re-rendered by a second model call whose instruction is to preserve meaning and change only wording.',
    beats: [
      'Input has no required format. Fragments are processed as written. Fork detection runs locally on each keystroke and lists every reading it finds; clean text shows nothing.',
      'The model’s rewrite streams as it is produced. Stop halts it. Typing a correction re-runs the rewrite with your correction attached. Editing the text changes what runs. Nothing runs until Go.',
      'The reply appears on the right exactly as returned, with the model’s name under it. The left copy is a re-rendering under a meaning-preservation instruction; the two are aligned row by row so any difference is visible.',
    ],
    dials:
      'Two boards of five sliders, each 0 to 100. Your board: each slider selects one of three fixed sentences by its range (below 40, 40 to 60, above 60); the five sentences are the instruction given to the re-rendering step. The model’s board: the five values are converted by fixed formulas into temperature, top_p, and max_tokens, which are passed as the call’s parameters, and into stance sentences, which are placed in the system prompt; the derived context, tool-use, and retry strategies are displayed but do nothing in a plain chat. The same values always produce the same parameters. Values are kept in this browser and leave it only inside a request you send.',
  },
};
