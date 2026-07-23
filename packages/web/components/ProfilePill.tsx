'use client';

import { useProfile } from '@/components/ProfileProvider';
import { PROFILES, PROFILE_ORDER, type ProfileKey } from '@/lib/profiles';

/**
 * Persistent register switcher in the nav. Deliberately findable: visible on
 * every viewport, sky-tinted so it reads as a control rather than chrome —
 * this is the always-available handle the chooser section points at
 * ("change it anytime, up top").
 */
export function ProfilePill() {
  const { profile, setProfile } = useProfile();
  return (
    <label className="mr-1 flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 py-1 pl-3 pr-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
        Reading as
      </span>
      <select
        value={profile}
        onChange={(e) => setProfile(e.target.value as ProfileKey)}
        className="max-w-[9rem] cursor-pointer rounded-full border border-white/10 bg-gray-900 px-2 py-1 text-xs font-medium text-white outline-none transition-colors hover:border-sky-400/50 sm:max-w-none"
        aria-label="Reading profile"
      >
        {PROFILE_ORDER.map((k) => (
          <option key={k} value={k}>
            {PROFILES[k].label}
          </option>
        ))}
      </select>
    </label>
  );
}
