import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Stability Regimes' };

export default function RegimesPage() {
  return (
    <div>
      <h1>Stability Regimes</h1>
      <p>
        The RPCS-1 framework identifies four stability regimes. The tuner predicts which regime
        your agent will operate in under the recommended parameters and warns when configuration
        is near a failure boundary.
      </p>

      <h2>Stable</h2>
      <p>
        Balanced primitives, well-matched to environment. The agent takes action when appropriate,
        integrates context appropriately, and updates its model at the right pace.
      </p>
      <pre><code>{`TI: [40–70]  SG: [30–60]  FT: [30–60]
UE: [40–70]  AR: [40–70]`}</code></pre>

      <h2>Near Oscillation</h2>
      <p>
        <strong>Condition:</strong> TI ≥ 65 <em>and</em> SG ≥ 55.
      </p>
      <p>
        The agent integrates a long history (high TI) while amplifying signals strongly (high SG).
        It revisits the same evidence repeatedly without committing. In production this looks like:
      </p>
      <ul>
        <li>Agent re-reads the same context repeatedly</li>
        <li>Tool calls issued, then immediately retried with slight variations</li>
        <li>Agent fails to commit to a conclusion despite sufficient information</li>
      </ul>
      <p><strong>Fix:</strong> Lower SG (raise temperature) or reduce TI (shorter context window).</p>

      <h2>Near Overload</h2>
      <p>
        <strong>Condition:</strong> TI ≤ 35 <em>and</em> SG ≥ 65.
      </p>
      <p>
        The agent processes only a short window (low TI) while strongly amplifying signals (high SG).
        It acts on insufficient information. In production:
      </p>
      <ul>
        <li>Agent hallucinates tool parameters or invents facts</li>
        <li>Confident conclusions reached far too quickly</li>
        <li>Retry logic triggers on valid outputs</li>
      </ul>
      <p><strong>Fix:</strong> Lower SG (raise temperature) or raise FT (add explicit confirmation).</p>

      <h2>Near Freeze</h2>
      <p>
        <strong>Condition:</strong> UE ≤ 35 <em>and</em> FT ≥ 65.
      </p>
      <p>
        The agent resists updating its model (low UE) and applies a high filter before acting (high FT).
        It hedges endlessly. In production:
      </p>
      <ul>
        <li>Agent produces verbose hedging without committing</li>
        <li>Requests clarification on well-specified tasks</li>
        <li>Tool calls never issued despite clear instructions</li>
      </ul>
      <p><strong>Fix:</strong> Lower FT or raise UE. Adjust commitment style from cautious to balanced.</p>

      <h2>The oscillation threshold</h2>
      <p>
        In addition to the four regimes, the tuner checks the <strong>oscillation threshold</strong>:
      </p>
      <pre><code>SG × TI &gt; 7000 → oscillation risk warning</code></pre>
      <p>
        This is a soft boundary — the agent may still be classified &quot;stable&quot; while exceeding it,
        but the risk is elevated and a warning is surfaced. This threshold comes from Paper 9
        §oscillatory threshold in the RPCS-1 framework.
      </p>
    </div>
  );
}
