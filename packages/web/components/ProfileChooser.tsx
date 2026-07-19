'use client';

import { useProfile } from '@/components/ProfileProvider';
import { PROFILES, PROFILE_ORDER } from '@/lib/profiles';

export function ProfileChooser() {
  const { profile, setProfile } = useProfile();
  return (
    <section className="border-b border-white/5 bg-[#0a101d]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-semibold text-white/80">
            How do you want this explained?
            <span className="ml-2 hidden font-normal text-white/40 sm:inline">
              Pick a reading profile — change it anytime, up top.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFILE_ORDER.map((k) => {
              const p = PROFILES[k];
              const active = profile === k;
              return (
                <button
                  key={k}
                  onClick={() => setProfile(k)}
                  className={`rounded-xl border px-3.5 py-2 text-left transition-colors ${
                    active
                      ? 'border-sky-400/60 bg-sky-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/85'
                  }`}
                >
                  <span className="block text-sm font-semibold">{p.label}</span>
                  <span className="block text-[11px] text-white/40">{p.tagline}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-xs text-white/35">
          Profiles change the explanations only. Pricing, deliverables, and limitations are
          identical in every profile — flip through and check.
        </p>
      </div>
    </section>
  );
}
