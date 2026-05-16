import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'The Matching Principle' };

export default function MatchingPage() {
  return (
    <div>
      <h1>The Matching Principle (Pred-09-5)</h1>

      <blockquote>
        Stable receivers in an environment with entropy H satisfy TI ≈ 1 / H.
      </blockquote>

      <p>
        This is the core structural insight behind every TI recommendation. It comes from
        IMM Paper 9 and the RPCS-1 receiver dynamics framework.
      </p>

      <h2>What it means in practice</h2>
      <p>
        Environmental entropy H measures how frequently and unpredictably an environment changes.
        The Matching Principle says the Temporal Integration window (TI) of a stable receiver must
        scale inversely with H:
      </p>
      <ul>
        <li>
          <strong>High entropy (chaotic environment)</strong> → short TI.
          The agent should integrate only recent signals; old context is noise.
          Maps to short context windows, frequent grounding, small max_tokens.
        </li>
        <li>
          <strong>Low entropy (stable environment)</strong> → long TI.
          The agent benefits from integrating deep history; old context is still relevant.
          Maps to long context windows, rolling summaries, large max_tokens.
        </li>
      </ul>

      <h2>The lookup table</h2>
      <p>
        The SDK implements this as a linear interpolation over a lookup table
        (from <code>config/matching.json</code>):
      </p>
      <pre><code>{`H = 0.10 → TI = 90  (long deep integration)
H = 0.25 → TI = 70  (stable integration)
H = 0.50 → TI = 50  (balanced integration)
H = 0.75 → TI = 30  (responsive integration)
H = 0.95 → TI = 10  (rapid response)`}</code></pre>
      <p>
        For intermediate values, TI is linearly interpolated between the nearest table entries.
        For example, H = 0.2 (a &quot;stable&quot; environment) interpolates to TI ≈ 77.
      </p>

      <h2>Entropy levels</h2>
      <pre><code>{`stable   → H = 0.20
moderate → H = 0.50
dynamic  → H = 0.75
chaotic  → H = 0.95`}</code></pre>

      <h2>The oscillation threshold</h2>
      <p>
        The Matching Principle also implies a stability boundary: when SG × TI exceeds
        the oscillation threshold, the receiver is structurally near the oscillation regime —
        it integrates too long while amplifying too strongly, causing it to revisit decisions.
      </p>
      <pre><code>{`oscillation threshold: SG × TI > 7000

# Example: SG=80, TI=90 → product=7200 → oscillation warning`}</code></pre>
      <p>
        The tuner surfaces a warning whenever your configuration approaches this boundary.
      </p>

      <h2>Why this matters for LLMs</h2>
      <p>
        LLMs don&apos;t have a literal &quot;integration window&quot; in the receiver-dynamics sense, but the
        structural analogy holds:
      </p>
      <ul>
        <li>TI maps to <strong>how much context the model is given and expected to use</strong> — context window size, rolling-summary frequency, grounding injection rate.</li>
        <li>SG maps inversely to <strong>temperature</strong> — a high-gain receiver amplifies signal differences, which in LLMs means low temperature (crisper, more deterministic outputs).</li>
        <li>The oscillation threshold maps to the regime where a model with a very long context and very low temperature will start <strong>re-analyzing the same evidence</strong> in loops.</li>
      </ul>
      <p>
        The cross-substrate conjecture (C-12-1 from RPCS-1) holds that the same receiver-dynamics
        framework applies across biological, artificial, and hybrid cognitive systems.
        Every production deployment of this SDK is a test of that conjecture.
      </p>
    </div>
  );
}
