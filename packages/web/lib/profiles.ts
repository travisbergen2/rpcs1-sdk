/**
 * Reading profiles: presentation registers for the same content.
 *
 * DESIGN RULE (binding): the register varies, the facts never do.
 * Prices, deliverables, guarantees, and limitations are NOT in this
 * dictionary and must never be — offer content renders from a single
 * source in every profile, so differential offers are structurally
 * impossible. Profiles change explanations only.
 *
 * These are starting presets for how you like information delivered —
 * not personality types, and not boxes anyone belongs in.
 */

export type ProfileKey = 'technical' | 'executive' | 'plain' | 'literal';

export interface ProfileCopy {
  key: ProfileKey;
  label: string;
  tagline: string;
  hero: { kicker: string; h1: string; accent: string; sub: string };
  failHeading: string;
  failIntro: string;
  tells: { oscillation: string; overload: string; freeze: string };
  compareStatement: string;
}

export const PROFILE_ORDER: ProfileKey[] = ['technical', 'executive', 'plain', 'literal'];

export const PROFILES: Record<ProfileKey, ProfileCopy> = {
  technical: {
    key: 'technical',
    label: 'Technical',
    tagline: 'Dense, numbers first, jargon fine',
    hero: {
      kicker: 'Stop guessing temperature',
      h1: 'Know exactly what to change.',
      accent: 'Prove it worked by tomorrow.',
      sub: 'Describe your workload and get the settings to paste — temperature, memory, alert sensitivity, commit threshold — plus one named follow-up test that verifies the fix within a session. Every number traces to registered, published research. Monitoring tools show you the problem; this hands you the fix and the proof.',
    },
    failHeading: 'Three ways agents fail. You’ve seen at least one this week.',
    failIntro:
      'These aren’t metaphors — they’re the three failure modes of any bounded decision system, and which one you’re near is computable from your workload.',
    tells: {
      oscillation:
        'It flip-flops — rewrites its own work, reverses decisions, chases every new signal.',
      overload:
        'It drowns — context stuffed full, every alert firing, quality collapsing as the session grows.',
      freeze:
        'It stalls — hedges forever, asks for confirmation it doesn’t need, never commits.',
    },
    compareStatement:
      'RPCS-1 maps your workload’s entropy, stakes, and change rate onto five runtime dials via derived receiver laws, and returns the nearest failure mode plus a falsifiable follow-up test.',
  },
  executive: {
    key: 'executive',
    label: 'Executive',
    tagline: 'Outcomes, risk, and time — skip the mechanism',
    hero: {
      kicker: 'Ship with evidence, not vibes',
      h1: 'Ship agents with proof,',
      accent: 'not hope.',
      sub: 'A decision-ready read in an hour: what to change before rollout and the one test that confirms it worked. Dashboards report problems after customers feel them; this prevents them — at a diagnostic price, not a consulting engagement, with every recommendation backed by published research.',
    },
    failHeading: 'The three failure modes that reach production.',
    failIntro:
      'Each one shows up as cost — rework, degradation, or stalled automation — and each is detectable before rollout.',
    tells: {
      oscillation:
        'Rework loops: output changes run to run, and your team stops trusting the automation.',
      overload:
        'Quality degrades as sessions grow — while token costs climb in the same curve.',
      freeze:
        'It escalates everything to humans; the automation stops saving anyone time.',
    },
    compareStatement:
      'RPCS-1 tells you whether an agent is safe to ship, what to change if it isn’t, and how you’ll know the change worked — one page, decision-ready.',
  },
  plain: {
    key: 'plain',
    label: 'Plain language',
    tagline: 'Short sentences, no jargon',
    hero: {
      kicker: 'A check-up for your AI agent',
      h1: 'Fix your AI agent —',
      accent: 'and see proof that it’s fixed.',
      sub: 'Tell us what your agent does. You get the settings to change and one test that shows the fix worked. Free to check, plain language. Other tools show you charts; this tells you what to do.',
    },
    failHeading: 'The three problems',
    failIntro: 'Every AI agent problem we see is one of these three.',
    tells: {
      oscillation: 'It keeps changing its mind and redoing its own work.',
      overload: 'It takes on too much at once and gets worse the longer it runs.',
      freeze: 'It gets stuck. It won’t act without being pushed.',
    },
    compareStatement:
      'You describe what your agent does. We tell you what to change, and give you one test that shows whether the change worked.',
  },
  literal: {
    key: 'literal',
    label: 'Literal & precise',
    tagline: 'Exact statements, assumptions named, no idioms',
    hero: {
      kicker: 'Deterministic settings calculator',
      h1: 'Input: a description of your workload.',
      accent: 'Output: settings, plus the test that verifies them.',
      sub: 'RPCS-1 computes agent runtime settings from workload properties and names one verification test to run after applying them. Each value includes the rule that produced it; the same input always produces the same output. Distinction from alternatives: monitoring tools report state; this returns a prescription with a verification procedure. Free output is directional; the paid diagnostic adds a written memo.',
    },
    failHeading: 'The three failure modes, defined',
    failIntro:
      'Definitions below. A workload can be near at most one of these at a time; “near” is computed, not judged.',
    tells: {
      oscillation: 'Oscillation: outputs reverse without new information arriving.',
      overload:
        'Overload: input volume exceeds processing capacity; error rate rises with session length.',
      freeze:
        'Freeze: the evidence threshold for acting is set higher than the task ever reaches; no action is taken.',
    },
    compareStatement:
      'RPCS-1 takes a workload description and returns: five setting values, the name of the nearest failure mode, and one test to run after applying the settings. It does not infer intent beyond the description.',
  },
};
