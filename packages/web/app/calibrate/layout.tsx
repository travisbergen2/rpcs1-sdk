import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calibrate — your receiver profile in five questions',
  description:
    'Five behavioral questions place you continuously on the five RPCS-1 receiver primitives — a profile, never a category label. Answers stay in your tab; nothing is stored.',
  alternates: { canonical: 'https://rpcs1.dev/calibrate' },
};

export default function CalibrateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
