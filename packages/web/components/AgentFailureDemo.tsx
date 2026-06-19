const BAD_LOG = [
  'Search docs',
  'Search docs again',
  'Retry tool call',
  'Need more context',
  'Search docs again',
];

const GOOD_LOG = [
  'Classify task',
  'Measure entropy',
  'Set thresholds',
  'Pick context plan',
  'Commit safely',
];

export function AgentFailureDemo() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="mb-8 text-center">
        <p className="text-xs font-mono text-sky-400 mb-3">before / after</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          Same agent. Different production behavior.
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Defaults that look fine in a demo can fail under live pressure. RPCS-1 turns the
          operating conditions into a clearer context, tool-use, and handoff posture.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gray-950 p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-red-500/50" />
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-sm font-semibold text-white">Guessed configuration</p>
              <p className="text-xs text-gray-500">High stakes, dynamic inputs, guessed defaults</p>
            </div>
            <span className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-mono text-red-300">
              looping
            </span>
          </div>

          <div className="failure-stage">
            <div className="bot bot-bad" aria-hidden="true">
              <div className="bot-antenna" />
              <div className="bot-eye left" />
              <div className="bot-eye right" />
              <div className="bot-mouth" />
            </div>
            <div className="failure-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {BAD_LOG.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="bad-log-row flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-xs"
                style={{ animationDelay: `${index * 0.45}s` }}
              >
                <span className="text-gray-400">{item}</span>
                <span className="font-mono text-red-300">retry</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-100">Result: oscillation, tool churn, no confident final action.</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gray-950 p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400/60" />
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-sm font-semibold text-white">RPCS-1 recommended posture</p>
              <p className="text-xs text-gray-500">Operating conditions mapped to implementation settings</p>
            </div>
            <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
              stable
            </span>
          </div>

          <div className="failure-stage">
            <div className="bot bot-good" aria-hidden="true">
              <div className="bot-antenna" />
              <div className="bot-eye left" />
              <div className="bot-eye right" />
              <div className="bot-mouth" />
            </div>
            <div className="signal-path" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              temp <span className="text-sky-300">0.52</span>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              FT <span className="text-emerald-300">raised</span>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              context <span className="text-amber-300">rolling</span>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-gray-400">
              regime <span className="text-emerald-300">stable</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {GOOD_LOG.map((item, index) => (
              <div
                key={item}
                className="good-log-row flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-xs"
                style={{ animationDelay: `${index * 0.38}s` }}
              >
                <span className="text-gray-400">{item}</span>
                <span className="font-mono text-emerald-300">ok</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm text-emerald-100">Result: grounded context, cleaner tool use, and a clear path to resolution.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
