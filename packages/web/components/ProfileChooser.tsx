'use client';

import Link from 'next/link';
import { useProfile } from '@/components/ProfileProvider';
import { PROFILES, PROFILE_ORDER, type ProfileKey } from '@/lib/profiles';

/**
 * Register chooser: centered heading, four style cards side by side, each
 * showing the receiver parameter values most likely to match a reader who
 * prefers that register.
 *
 * HONESTY NOTE — where these numbers come from: each vector is scoreIntake()
 * applied to the intake answers a reader choosing that register would
 * typically give (anchors from @rpcs1/core intake.ts). They are a typical
 * starting prior, NOT a measurement — the /calibrate flow measures yours.
 * Axes where the register implies nothing stay at the neutral prior (50).
 */

type Dial = { key: 'TI' | 'SG' | 'FT' | 'UE' | 'AR'; name: string };

const DIALS: Dial[] = [
  { key: 'TI', name: 'Memory' },
  { key: 'SG', name: 'Gain' },
  { key: 'FT', name: 'Trigger' },
  { key: 'UE', name: 'Agility' },
  { key: 'AR', name: 'Commit' },
];

/** Typical receiver vector per register (intake anchors; 50 = neutral prior). */
const TYPICAL_RECEIVER: Record<ProfileKey, Record<Dial['key'], number>> = {
  technical: { TI: 20, SG: 25, FT: 50, UE: 50, AR: 75 },
  executive: { TI: 20, SG: 50, FT: 25, UE: 50, AR: 75 },
  plain: { TI: 50, SG: 50, FT: 50, UE: 50, AR: 50 },
  literal: { TI: 80, SG: 25, FT: 80, UE: 50, AR: 25 },
};

export function ProfileChooser() {
  const { profile, setProfile } = useProfile();
  return (
    <section aria-label="Reading profile" className="border-y border-white/5 bg-[#0a101d]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How do you want this explained?
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Pick a reading profile — change it anytime, up top.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILE_ORDER.map((k) => {
            const p = PROFILES[k];
            const active = profile === k;
            const vector = TYPICAL_RECEIVER[k];
            return (
              <button
                key={k}
                onClick={() => setProfile(k)}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  active
                    ? 'border-sky-400/60 bg-sky-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                }`}
              >
                <span className="block text-base font-semibold text-white">{p.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-white/45">
                  {p.tagline}
                </span>
                <span className="mt-4 block space-y-1.5">
                  {DIALS.map((d) => (
                    <span key={d.key} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wider text-white/40">
                        {d.name}
                      </span>
                      <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${active ? 'bg-sky-400' : 'bg-white/35'}`}
                          style={{ width: `${vector[d.key]}%` }}
                        />
                      </span>
                      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-white/45">
                        {vector[d.key]}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-white/35">
          Profiles change the explanations only — pricing, deliverables, and limitations are
          identical in every register. The values shown are the typical calibration for readers
          who prefer that register, not a measurement of you: axes a register says nothing about
          sit at the neutral prior (50). Want your own numbers? Take the{' '}
          <Link href="/calibrate" className="text-sky-400/80 underline-offset-4 hover:underline">
            60-second calibration
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
