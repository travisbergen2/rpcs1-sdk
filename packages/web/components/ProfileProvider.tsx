'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { track } from '@vercel/analytics';
import type { ProfileKey } from '@/lib/profiles';

const STORAGE_KEY = 'rpcs1-profile';

interface ProfileCtx {
  profile: ProfileKey;
  setProfile: (p: ProfileKey) => void;
}

const Ctx = createContext<ProfileCtx>({ profile: 'technical', setProfile: () => {} });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileKey>('technical');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'technical' || saved === 'executive' || saved === 'plain' || saved === 'literal') {
        setProfileState(saved);
      }
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const setProfile = (p: ProfileKey) => {
    setProfileState(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
    try {
      track('profile_selected', { profile: p });
    } catch {
      /* analytics unavailable — ignore */
    }
  };

  return <Ctx.Provider value={{ profile, setProfile }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  return useContext(Ctx);
}
