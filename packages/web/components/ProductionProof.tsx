import Image from 'next/image';

const METRICS = [
  { label: 'Modeled completion', value: '100%', detail: 'synthetic benchmark' },
  { label: 'Output budget reduction', value: '71.5%', detail: 'synthetic open-ended suite' },
  { label: 'Modeled loop reduction', value: '81.8%', detail: 'synthetic regime score' },
  { label: 'Synthetic traces', value: '1,000', detail: '500 baseline, 500 RPCS-1' },
];

const AGENTS = [
  ['Data analysis', '77.1%', '+38 pts'],
  ['Research', '76.3%', '+20 pts'],
  ['Medical', '76.8%', '+20 pts'],
  ['Multi-tool', '73.3%', '+18 pts'],
  ['Safety', '73.0%', '+20 pts'],
];

const COMPARISON = [
  {
    category: 'Agent frameworks',
    examples: 'LangChain, CrewAI, AutoGen',
    focus: 'Build workflows, tools, memory, and agent orchestration.',
    gap: 'Still leaves teams guessing the operating regime and parameter profile.',
    rpcs: 'Adds a pre-deployment configuration review tied to the agent operating environment.',
  },
  {
    category: 'Observability',
    examples: 'LangSmith, Langfuse, Helicone',
    focus: 'Trace runs, monitor latency/cost, inspect failures, and debug production behavior.',
    gap: 'Great at showing what happened after the run; less focused on pre-run regime selection.',
    rpcs: 'Turns operating conditions into a configuration hypothesis to evaluate against production traces.',
  },
  {
    category: 'Evals and experiments',
    examples: 'Braintrust, promptfoo, custom evals',
    focus: 'Score prompts, compare variants, and measure model or workflow quality.',
    gap: 'Teams still need a theory for which knobs to change when an eval fails.',
    rpcs: 'Suggests which runtime settings are worth testing when quality changes across environments.',
  },
  {
    category: 'Prompt iteration',
    examples: 'Prompt libraries, playgrounds, manual tuning',
    focus: 'Improve instructions, examples, and output shape.',
    gap: 'Prompt edits can hide structural instability instead of fixing it.',
    rpcs: 'Adds configuration fit as a testable hypothesis alongside prompt changes.',
  },
];

export function ProductionProof() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="mb-8 text-center">
        <p className="text-xs font-mono text-emerald-400 mb-3">evaluation roadmap</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          A recommendation is the start. Behavioral verification is the finish line.
        </h2>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Today&apos;s tuner produces a deterministic configuration hypothesis. Paper 17 defines
          the research-grade assay battery for measuring the configured agent, checking prompt
          robustness and stochastic variation, and verifying that a change improves the intended
          behavior. Until that battery is run, the benchmark below remains directional simulation.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {METRICS.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-xs text-gray-500 mb-2">{metric.label}</p>
            <p className="text-3xl font-bold text-white">{metric.value}</p>
            <p className="mt-2 text-xs text-gray-500">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5 mb-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3">
          <Image
            src="/benchmarks/rpcs1_benchmark_charts.png"
            alt="RPCS-1 benchmark charts showing higher completion, lower failures, and lower token consumption"
            width={2048}
            height={1638}
            className="h-auto w-full rounded-xl bg-white"
          />
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Largest synthetic budget reductions</h3>
            <div className="space-y-3">
              {AGENTS.map(([name, savings, improvement]) => (
                <div key={name} className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2">
                  <span className="text-sm text-gray-300">{name}</span>
                  <span className="text-xs font-mono text-emerald-300">{savings} saved</span>
                  <span className="text-xs font-mono text-sky-300">{improvement}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3">
            <Image
              src="/benchmarks/rpcs1_trajectory_comparison.png"
              alt="Baseline agent trajectory spirals while RPCS-1 calibrated agent converges"
              width={2048}
              height={1150}
              className="h-auto w-full rounded-xl bg-white"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3 mb-12">
        <Image
          src="/benchmarks/rpcs1_cost_savings.png"
          alt="Projected RPCS-1 token cost savings by model and scale"
          width={1488}
          height={864}
          className="h-auto w-full rounded-xl bg-white"
        />
      </div>

      <div className="mb-8 text-center">
        <p className="text-xs font-mono text-sky-400 mb-3">competitive context</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          RPCS-1 connects production symptoms to the next configuration decision.
        </h2>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Frameworks build the agent. Observability shows what happened. Evals score the result.
          RPCS-1 adds a structured hypothesis for why quality failed, what runtime posture to change,
          and which behavior should be re-tested.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
        <div className="hidden md:grid grid-cols-5 border-b border-gray-800 bg-gray-900/70 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <div className="p-4">Category</div>
          <div className="p-4">Examples</div>
          <div className="p-4">What they optimize</div>
          <div className="p-4">Common gap</div>
          <div className="p-4 text-sky-300">RPCS-1 layer</div>
        </div>
        {COMPARISON.map((row) => (
          <div key={row.category} className="grid grid-cols-1 md:grid-cols-5 border-b border-gray-800 last:border-b-0">
            <div className="p-4 text-sm font-semibold text-white">
              <span className="mb-1 block text-xs font-normal uppercase tracking-wide text-gray-600 md:hidden">Category</span>
              {row.category}
            </div>
            <div className="p-4 pt-0 text-sm text-gray-400 md:pt-4">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 md:hidden">Examples</span>
              {row.examples}
            </div>
            <div className="p-4 pt-0 text-sm text-gray-400 md:pt-4">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 md:hidden">What they optimize</span>
              {row.focus}
            </div>
            <div className="p-4 pt-0 text-sm text-gray-400 md:pt-4">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 md:hidden">Common gap</span>
              {row.gap}
            </div>
            <div className="p-4 text-sm text-sky-100 bg-sky-500/5">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-500 md:hidden">RPCS-1 layer</span>
              {row.rpcs}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-600 text-center">
        Benchmark data is synthetic simulation output. Savings reflect regime-appropriate output
        budgets and must be reported with truncation and task-quality measurements in real deployments.
      </p>
    </section>
  );
}
