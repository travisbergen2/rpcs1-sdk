/**
 * Labs registry — every station that used to compete for the nav.
 *
 * One product fronts the site (the box on the landing page). Everything
 * else remains live at its original route — for links, search engines, and
 * the people already using it — and is discoverable here.
 */
export type LabGroup = 'For people' | 'For agents' | 'Research & extras';

export interface LabEntry {
  href: string;
  name: string;
  desc: string;
  group: LabGroup;
}

export const LAB_GROUPS: LabGroup[] = [
  'For people',
  'For agents',
  'Research & extras',
];

export const LABS: LabEntry[] = [
  {
    href: '/send',
    name: 'SendRight',
    desc: 'The box from the front page, full size — type like you talk, see the forks, hand off to your own AI app.',
    group: 'For people',
  },
  {
    href: '/connect',
    name: 'Second Brain',
    desc: 'Your notes, inside the AI apps you already use — one-click setup for Claude Desktop, Cursor, VS Code, and more. Nothing leaves your machine until you choose folders.',
    group: 'For people',
  },
  {
    href: '/bridge',
    name: 'Translation Bridge',
    desc: 'Full duplex: decode what a reply actually meant, and rewrite for the specific person receiving it.',
    group: 'For people',
  },
  {
    href: '/translator',
    name: 'Translator',
    desc: 'Untangle a message that could mean three things, split mixed asks, rewrite for a receiver profile.',
    group: 'For people',
  },
  {
    href: '/calibrate',
    name: 'Calibrate',
    desc: 'Five questions that measure how you actually read — your receiver profile.',
    group: 'For people',
  },
  {
    href: '/guess',
    name: 'Guessing Test',
    desc: 'Watch an AI guess at an ambiguous prompt — the problem, demonstrated live.',
    group: 'For people',
  },
  {
    href: '/mismatch',
    name: 'Mismatch',
    desc: 'Where your self-read and the observed read disagree.',
    group: 'For people',
  },
  {
    href: '/tuner',
    name: 'Agent Tuner',
    desc: 'Five dials for one described workload — settings to paste and the failure mode to watch.',
    group: 'For agents',
  },
  {
    href: '/diagnostic',
    name: 'Founding Diagnostic',
    desc: 'The written memo: what to change, in what order, and the test that proves the fix.',
    group: 'For agents',
  },
  {
    href: '/docs/mcp',
    name: 'MCP Server',
    desc: 'The same engine as a tool your agents call directly.',
    group: 'For agents',
  },
  {
    href: '/rd',
    name: 'R&D Scorecard',
    desc: 'Every law and every registered check — including the ones that failed.',
    group: 'Research & extras',
  },
  {
    href: '/imm',
    name: 'IMM',
    desc: 'The research corpus behind the engine.',
    group: 'Research & extras',
  },
  {
    href: '/local',
    name: 'Speed Report',
    desc: 'Your website speed report — what it means and the fix.',
    group: 'Research & extras',
  },
];
