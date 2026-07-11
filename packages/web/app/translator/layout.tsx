import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Translator Hub — interpret, rewrite, route | RPCS-1',
  description:
    'The RPCS-1 receiver framework pointed at human communication: interpret ambiguous messages, split mixed intents, and rewrite for a calibrated receiver profile instead of a lumped style.',
  alternates: { canonical: 'https://rpcs1.dev/translator' },
};

export default function TranslatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
