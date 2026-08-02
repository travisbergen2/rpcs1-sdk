import Link from 'next/link';

/**
 * EvidenceCard — the E-RX-1 registered-test claim, shown at conversion moments.
 *
 * Claim discipline: these numbers come from E-RX-1 (frozen 2026-07-26, run
 * 2026-07-27, corroboration grade): pooled bare-output compliance rose from
 * 69% to 96% (Δ +0.271, exact McNemar p < 0.00001, n = 192 paired cells,
 * six frontier models) when prompts were recomposed by the rpcs1 directive
 * bundle. Verdict PASS-GENERIC: the bundle works as prompt hygiene; the
 * per-model targeting prediction failed and that claim is withdrawn pending
 * E-RX-2. Do not edit the numbers without a new registered test.
 */
export function EvidenceCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs leading-relaxed text-gray-500">
        <span className="font-mono text-emerald-400">69% → 96%</span>{' '}
        <span className="text-gray-400">
          bare-output compliance across six frontier models when prompts were recomposed by the
          rpcs1 directive bundle
        </span>{' '}
        (n=192 paired prompts, p&lt;0.00001, registered test — criteria frozen before data).{' '}
        <Link href="/rd#erx1" className="text-sky-500 underline-offset-4 hover:underline">
          See the full result, including what failed →
        </Link>
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">
        Measured, not promised
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">
        In a registered test, prompts recomposed by the rpcs1 directive bundle raised bare-output
        compliance from <span className="font-mono font-semibold text-emerald-300">69%</span> to{' '}
        <span className="font-mono font-semibold text-emerald-300">96%</span> across six frontier
        models — roughly one extra correct-format output for every 3.7 calls (n=192 paired
        prompts, p&lt;0.00001).
      </p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        Criteria were frozen before any data. One registered sub-prediction failed and its claim
        was withdrawn — that&apos;s part of the record too.{' '}
        <Link href="/rd#erx1" className="text-sky-500 underline-offset-4 hover:underline">
          Read the full result →
        </Link>
      </p>
    </div>
  );
}
