'use client';

import { useProfile } from '@/components/ProfileProvider';
import { PROFILES, PROFILE_ORDER, type ProfileKey } from '@/lib/profiles';

export function ProfilePill() {
  const { profile, setProfile } = useProfile();
  return (
    <label className="ml-2 hidden items-center gap-1.5 md:flex">
      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-600">
        Reading as
      </span>
      <select
        value={profile}
        onChange={(e) => setProfile(e.target.value as ProfileKey)}
        className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 outline-none transition-colors hover:border-gray-500"
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
