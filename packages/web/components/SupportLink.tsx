import { DONATIONS_LIVE, SUPPORT_URL } from '@/lib/flags';

/**
 * The support/donation rail — DORMANT by design until the flags flip
 * (see lib/flags.ts for the gate order). Renders nothing while dormant so
 * the pages that include it need no changes on the day it goes live.
 */
export function SupportLink({ live = DONATIONS_LIVE, url = SUPPORT_URL }: { live?: boolean; url?: string }) {
  if (!live || !url) return null;
  return (
    <p className="mt-4 text-sm text-gray-400">
      Free means we pay for the computer that answers you.{' '}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-amber-300 underline-offset-4 hover:text-amber-200 hover:underline"
      >
        Chip in if you&apos;re able
      </a>{' '}
      — every few dollars keeps thousands of rounds free for everyone.
    </p>
  );
}
