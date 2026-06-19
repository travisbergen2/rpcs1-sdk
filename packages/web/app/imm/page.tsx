import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IMM / RPCS-1 Primer for AI Agents',
  description:
    'An AI-readable primer for IMM, RPCS-1 receiver dynamics, many-to-one collapse, gate order, core equations, and AI agent pre-tuning.',
};

const GATES = [
  {
    name: 'FT',
    label: 'Filtering Threshold',
    plain: 'Filter noise first.',
    role: 'Decide which signals are allowed to enter the receiver state.',
    ai: 'Controls verification posture, explicit confirmation, and when the agent should refuse weak evidence.',
  },
  {
    name: 'TI',
    label: 'Temporal Integration',
    plain: 'Integrate over time.',
    role: 'Choose how much history is retained before action.',
    ai: 'Controls context strategy, grounding cadence, summaries, and runtime output budget.',
  },
  {
    name: 'AR',
    label: 'Ambiguity Resolution',
    plain: 'Resolve ambiguity.',
    role: 'Select one interpretation when multiple interpretations remain possible.',
    ai: 'Controls clarification, commitment, tool chaining, and whether to gather more evidence.',
  },
  {
    name: 'SG',
    label: 'Signal Gain',
    plain: 'Amplify only the interpreted signal.',
    role: 'Scale the selected signal after filtering and interpretation.',
    ai: 'Maps inversely to sampling temperature in the current tuner hypothesis.',
  },
  {
    name: 'UE',
    label: 'Update Elasticity',
    plain: 'Then update or act.',
    role: 'Decide how readily the receiver state changes after new evidence.',
    ai: 'Controls retry strategy, adaptation speed, and re-grounding under changing conditions.',
  },
];

const FAILURE_MODES = [
  ['oscillation', 'The receiver keeps revisiting the same evidence and cannot settle. Often long TI plus high SG.'],
  ['overload', 'The receiver admits too much signal and acts on insufficiently filtered evidence. Often high SG plus low FT.'],
  ['freeze', 'The receiver filters or resists updates so strongly that it cannot act. Often high FT plus low UE.'],
  ['mismatch', 'The receiver profile does not preserve the distinctions required by the environment.'],
];

export default function ImmPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <p className="text-xs font-mono text-sky-400 mb-3">AI-readable IMM primer</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-5">
          IMM → RPCS-1 → AI Agent Pre-Tuning
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          IMM says observers do not access reality directly. They compress many possible
          environmental states into receiver states. Matching occurs when that compression
          preserves the distinctions needed for successful action. RPCS-1 turns that into
          five tunable gates for AI agents.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">One-Pass Summary</h2>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`IMM -> many-to-one collapse -> receiver/environment matching
    -> five gates -> AI pre-tuning

Core gate order:
FT -> TI -> AR -> SG -> UE

Plain English:
Filter noise first. Integrate over time. Resolve ambiguity.
Amplify only the interpreted signal. Then update or act.`}
        </pre>
      </section>

      <section className="grid gap-5 mb-10">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">1. What IMM Is</h2>
          <p className="text-gray-400 leading-relaxed">
            IMM is a receiver-centered framework for observation, interpretation, and action.
            It treats an observer as a system that receives an environment through constrained
            gates rather than as a system with direct access to raw reality.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">2. Core Axiom: Observation Requires Compression</h2>
          <p className="text-gray-400 leading-relaxed">
            No receiver can carry every possible environmental distinction forward. Observation
            therefore requires compression: many environmental states are mapped into fewer
            receiver states.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`environment states E -> receiver states R
many possible E states -> fewer actionable R states`}
          </pre>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">3. Many-To-One Collapse</h2>
          <p className="text-gray-400 leading-relaxed">
            Many-to-one collapse is not a bug. It is the structural condition that makes
            observation usable. The risk is losing distinctions the task actually needs.
            RPCS-1 asks whether the receiver collapse matches the environment.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">4. Matching Principle</h2>
          <p className="text-gray-400 leading-relaxed">
            The Matching Principle operationalized in RPCS-1 assigns shorter integration windows
            to high-entropy environments and longer integration windows to stable environments.
            In product terms, this is a deterministic tuning rule to validate against traces.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`Pred-09-5:
stable receivers in environment entropy H satisfy TI ~= 1 / H

high H -> short TI
low H  -> long TI`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-4">5. The Five Gates In Correct Order</h2>
        <div className="mb-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
          <p className="font-mono text-lg text-sky-200">FT → TI → AR → SG → UE</p>
          <p className="mt-2 text-sm text-gray-400">
            Filter noise first. Integrate over time. Resolve ambiguity. Amplify only the
            interpreted signal. Then update or act.
          </p>
        </div>
        <div className="grid gap-3">
          {GATES.map((gate, index) => (
            <div key={gate.name} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
              <div className="flex flex-wrap items-baseline gap-3 mb-2">
                <span className="font-mono text-sky-300">{index + 1}. {gate.name}</span>
                <h3 className="text-lg font-semibold text-white">{gate.label}</h3>
              </div>
              <p className="text-sm text-emerald-300 mb-2">{gate.plain}</p>
              <p className="text-sm text-gray-400 mb-1">{gate.role}</p>
              <p className="text-sm text-gray-500">{gate.ai}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 mb-10">
        <h2 className="text-xl font-semibold text-white mb-4">6. Failure Modes</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FAILURE_MODES.map(([name, description]) => (
            <div key={name} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
              <h3 className="font-mono text-sm text-amber-300 mb-2">{name}</h3>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">7. Why This Matters For AI Agents</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          AI agents fail when their receiver profile does not match the environment they operate in.
          A support copilot under live queue pressure needs different filtering, context, ambiguity,
          gain, and update behavior than a slow research agent in a stable corpus.
        </p>
        <p className="text-gray-400 leading-relaxed">
          RPCS-1 is the pre-tuning layer: it translates environment conditions into a receiver
          profile before teams reach for prompt edits, agent-framework rewrites, or blind parameter
          sweeps.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 mb-10">
        <h2 className="text-xl font-semibold text-white mb-3">8. Minimal Equations</h2>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
{`Receiver:
R = (FT, TI, AR, SG, UE)

Environment:
E = (entropy, predictability, stakes, context horizon, commitment)

Matching:
fit is high when receiver compression preserves task-relevant distinctions

Matching Principle:
TI ~= 1 / H

Oscillation check:
SG * TI > threshold -> oscillation risk

Current AI runtime mapping hypothesis:
TI -> context_strategy and output budget
AR + FT -> tool_use_strategy
SG -> temperature inverse
UE -> retry and re-grounding strategy`}
        </pre>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <h2 className="text-xl font-semibold text-white mb-3">9. Links For Agents And Humans</h2>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/tuner" className="text-sky-400 hover:text-sky-300">Interactive tuner</Link> — run a concrete recommendation.</li>
          <li><Link href="/docs" className="text-sky-400 hover:text-sky-300">Documentation</Link> — product docs and platform mappings.</li>
          <li><Link href="/docs/primitives" className="text-sky-400 hover:text-sky-300">Five primitives</Link> — TI, SG, FT, UE, AR definitions.</li>
          <li><Link href="/docs/matching" className="text-sky-400 hover:text-sky-300">Matching Principle</Link> — the TI and entropy bridge.</li>
          <li><Link href="/docs/mcp" className="text-sky-400 hover:text-sky-300">MCP integration</Link> — public read-only AI access.</li>
          <li><a href="https://github.com/travisbergen2/rpcs1-sdk" className="text-sky-400 hover:text-sky-300" target="_blank" rel="noreferrer">Source repository</a> — SDK, server, and web app.</li>
        </ul>
      </section>
    </div>
  );
}
