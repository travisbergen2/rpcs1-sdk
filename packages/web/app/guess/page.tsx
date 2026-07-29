import type { Metadata } from 'next';
import { GuessTestPageBody } from '@/components/GuessTest';

export const metadata: Metadata = {
  title: 'The Guessing Test — see what an AI silently assumes | RPCS1',
  description:
    'Paste any sentence and see, instantly, the meaning an AI would silently pick for you — and the question it should have asked instead. Runs on your device, no AI involved.',
};

export default function GuessPage() {
  return <GuessTestPageBody />;
}
