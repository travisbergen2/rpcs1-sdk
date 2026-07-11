import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Tuner — derived runtime settings for your agent | RPCS-1',
  description:
    'Describe one workload and get a receiver profile, regime read, and runtime settings derived from the RPCS-1 receiver laws (IMM Paper 18). Free, deterministic, no account.',
  alternates: { canonical: 'https://rpcs1.dev/tuner' },
};

export default function TunerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
