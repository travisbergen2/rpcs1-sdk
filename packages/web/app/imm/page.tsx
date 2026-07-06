import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Framework — IMM & the Derived Receiver Laws',
  description:
    'How RPCS-1 is derived: IMM Paper 18 rebuilds the receiver framework from observer requirements — three forced blocks (estimate, detect, commit), five primitives as measurement coordinates, and matching laws with pre-registered checks.',
};

const BLOCKS = [
  {
    name: 'Estimate',
    primitives: 'TI, UE (and the sampling rate ρ)',
    what: 'Track a changing quantity from noisy observations.',
    why: 'Forced by the bare setup: any bounded observer estimating under noise faces the bias–variance trade. TI (how much history) and UE (how fast to update) are provably one control loop in two parameterizations for the minimal observer — they only separate in hierarchical receivers tracking fast state and slow rules at once.',
  },
  {
    name: 'Detect',
    primitives: 'SG, FT',
    what: 'Notice when the world has changed regime.',
    why: 'One alarm channel with two knobs: gain (SG) and criterion (FT). Its value is inherited, not posited — missed changes prolong stale estimates, false alarms reset good ones. Four other processes consume its reset signal, which is why a receiver that goes deaf loses measurably (3.2× in the agent simulation).',
  },
  {
    name: 'Commit',
    primitives: 'AR',
    what: 'Stop deliberating and act, under time pressure.',
    why: 'For discrete, time-bound actions, accumulate-evidence-to-a-bound is the optimal policy class (Wald–Wolfowitz, standard). The bound scales logarithmically with stakes-to-urgency, and drops when the world changes faster — evidence expires.',
  },
];

const LAWS = [
  ['R-1', 'Temporal integration', 'Integrate less when the world changes faster. Exact 1/λ scaling holds for change-detecting observers; fixed windows get a square-root law.'],
  ['R-2', 'Update elasticity', 'Update faster when the world changes faster. Cross-checked against the exact steady-state Kalman gain.'],
  ['R-3', 'Action rate', 'Look more often when the world changes faster — and disengaging entirely is never optimal under unbounded drift. Freezing is rational only when impact is bounded and looking is costly.'],
  ['R-4', 'Detection channel', 'Turn gain up and liberalize the alarm criterion as the change rate rises. The textbook criterion log-law failed its pre-registered check and was cut.'],
  ['R-5', 'Commitment', 'Commit faster when the world changes faster; thresholds are logarithmic in stakes-to-urgency.'],
];

const STATUS_ROWS = [
  ['Derived [D]', 'The R-1…R-5 law families, the three-block synthesis (T-OR-1), the rational-freeze boundary. Derived under named assumptions from standard mathematics — no lemma is claimed as new.'],
  ['Identified [I]', 'The bridge from "environmental entropy H" to an operational change rate. An identification, not a derivation — and it now carries empirical weight, which the paper says plainly.'],
  ['Predicted [P]', 'A registered battery of LLM tests (under $10 total) with outcomes that would count against the framework pre-stated. Untested as of v0.1.'],
  ['Failed & reported', 'Three pre-registered checks failed. One was an algebra error (corrected, then re-run), one is cut from the claims entirely, one was a discretization artifact (resolved at finer step). All three are in the paper.'],
];

export default function ImmPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-12">
        <p className="mb-3 text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
          The framework underneath RPCS-1
        </p>
        <h1 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Derived from what an observer has to be
        </h1>
        <p className="text-lg leading-relaxed text-gray-400">
          RPCS-1 is the practical layer of the IMM research program. Its current foundation is
          IMM Paper 18 (<em>Observer Requirements</em>, 2026), which asks the minimal question:
          what must any bounded system do to estimate a changing world from noisy observations
          and act on it in time? Each tuning knob then arrives as a forced consequence — with an
          optimal-setting law — rather than as an assertion.
        </p>
      </div>

      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-950 p-6">
        <h2 className="mb-3 text-xl font-semibold text-white">One-pass summary</h2>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`bounded observer + changing world + noisy signals + time pressure
    => three forced blocks:  ESTIMATE  ->  DETECT  ->  COMMIT
    => five primitives (TI, UE | SG, FT | AR) = measurement coordinates
    => matching laws: when the world changes faster =>
         integrate less, update faster, look more often,
         liberalize detection, commit sooner`}
        </pre>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          The five primitives are not five independent dimensions. They are a parameterization —
          a chart — over three coupled blocks. Legitimate as measurement coordinates, wrong as an
          ontology. Paper 18 supersedes the older &quot;five are forced&quot; claim on exactly this
          point.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-white">The three blocks</h2>
        <div className="grid gap-4">
          {BLOCKS.map((b, i) => (
            <div key={b.name} className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
              <div className="mb-2 flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-xs text-gray-600">0{i + 1}</span>
                <h3 className="text-lg font-semibold text-white">{b.name}</h3>
                <span className="rounded-full border border-gray-800 bg-gray-950 px-2.5 py-0.5 font-mono text-xs text-sky-300">
                  {b.primitives}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-300">{b.what}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{b.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">The matching laws</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          Every law family answers the same question — how should this knob move as the
          environment&apos;s change rate rises? — and every answer points the same direction.
          This is what the tuner operationalizes.
        </p>
        <div className="grid gap-3">
          {LAWS.map(([id, name, body]) => (
            <div key={id} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
              <p className="font-mono text-xs text-sky-300">
                {id} <span className="ml-2 text-gray-400">{name}</span>
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">
          What&apos;s derived, what&apos;s identified, what&apos;s still open
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          The corpus uses explicit epistemic labels on every claim, and the failures stay
          visible. If you&apos;re evaluating whether to trust the recommendations, this table is
          the honest basis:
        </p>
        <div className="grid gap-3">
          {STATUS_ROWS.map(([label, body]) => (
            <div key={label} className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <p className="font-mono text-sm text-amber-300">{label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-gray-600">
          Also stated plainly in the paper: nothing in the framework creates trading edge, and
          the three-block count is conditional on regime-switching environments with discrete,
          time-bound actions — the class that covers support, coding, research, and workflow
          agents. Outside it, the count degrades predictably, and that degradation is itself
          testable.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <h2 className="mb-3 text-xl font-semibold text-white">Failure modes, mapped to blocks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['oscillation', 'Over-updating: the estimate loop keeps revisiting the same evidence and cannot settle.'],
            ['overload', 'Detection saturation: too much signal gets through and weak evidence drives action.'],
            ['freeze', 'Epistemic freeze or an unreachable commitment bound: the receiver stalls when it should act.'],
            ['underdetermination', 'Commitment starved under deadline: forced to act before the evidence bound is reached.'],
          ].map(([name, description]) => (
            <div key={name} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
              <h3 className="mb-2 font-mono text-sm text-amber-300">{name}</h3>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-600">
          This mapping is interpretive [A] and part of the registered test battery — labeled as
          such, not sold as established.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
        <h2 className="mb-3 text-xl font-semibold text-white">Go deeper</h2>
        <ul className="space-y-2 text-gray-400">
          <li>
            <Link href="/tuner" className="text-sky-400 hover:text-sky-300">
              Interactive tuner
            </Link>{' '}
            — the laws, operationalized: get a concrete recommendation.
          </li>
          <li>
            <Link href="/docs/matching" className="text-sky-400 hover:text-sky-300">
              The matching laws in the SDK
            </Link>{' '}
            — how the derived laws become lookup tables and warnings.
          </li>
          <li>
            <Link href="/docs/primitives" className="text-sky-400 hover:text-sky-300">
              Five primitives
            </Link>{' '}
            — the measurement coordinates: TI, SG, FT, UE, AR.
          </li>
          <li>
            <a
              href="https://doi.org/10.5281/zenodo.19697792"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              The IMM paper series (Zenodo)
            </a>{' '}
            — the research corpus behind the product.
          </li>
          <li>
            <Link href="/pricing#diagnostic" className="text-amber-400 hover:text-amber-300">
              Paid diagnostic
            </Link>{' '}
            — a written memo for your team&apos;s agent.
          </li>
        </ul>
      </section>
    </div>
  );
}
