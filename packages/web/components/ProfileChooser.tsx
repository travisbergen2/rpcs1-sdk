'use client';

import { useProfile } from '@/components/ProfileProvider';
import { PROFILES, PROFILE_ORDER } from '@/lib/profiles';

/**
 * Slim register-switcher strip. Deliberately compact: the reading-profile
 * feature is differentiation, but it must never precede the value
 * proposition — a first-time visitor learns WHAT the product is before
 * being asked HOW they want it explained. (Same facts in every register.)
 */
export function ProfileChooser() {
  const { profile, setProfile } = useProfile();
  return (
    <section aria-label="Reading profile" className="border-y border-white/5 bg-[#0a101d]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <p className="text-xs font-semibold text-white/60">Read this page as:</p>
        <div className="flex flex-wrap gap-1.5">
          {PROFILE_ORDER.map((k) => {
            const p = PROFILES[k];
            const active = profile === k;
            return (
              <button
                key={k}
                onClick={() => setProfile(k)}
                title={p.tagline}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-sky-400/60 bg-sky-500/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/85'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-white/30">
          Same facts in every register — only the explanation changes.
        </p>
      </div>
    </section>
  );
}
