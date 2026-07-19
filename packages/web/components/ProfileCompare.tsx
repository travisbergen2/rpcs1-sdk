'use client';

import { useState } from 'react';
import { useProfile } from '@/components/ProfileProvider';
import { PROFILES, PROFILE_ORDER, type ProfileKey } from '@/lib/profiles';

export function ProfileCompare() {
  const { profile } = useProfile();
  const [other, setOther] = useState<ProfileKey>(profile === 'plain' ? 'technical' : 'plain');
  const left = PROFILES[profile];
  const right = PROFILES[other];

  return (
    <section className="border-t border-white/5 bg-[#090e1a]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
            See the difference
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Same product. Same deal. Your language.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/65">
            This is the translation engine doing to our own site what it does to your content.
            The statement below is identical in meaning in every profile — only the register
            moves.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-6">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-300">
              Your profile · {left.label}
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              {left.compareStatement}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs uppercase tracking-wider text-white/40">
                Compared with
              </p>
              <select
                value={other}
                onChange={(e) => setOther(e.target.value as ProfileKey)}
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 outline-none"
                aria-label="Comparison profile"
              >
                {PROFILE_ORDER.map((k) => (
                  <option key={k} value={k} className="bg-[#090e1a]">
                    {PROFILES[k].label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              {right.compareStatement}
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/45">
          What never moves: the free tuner is $0 with no account, the founding diagnostic is
          first-3-free then $99, and the deliverables lists are word-for-word identical in every
          profile. We translate the explanation. We never translate the deal.
        </p>
      </div>
    </section>
  );
}
