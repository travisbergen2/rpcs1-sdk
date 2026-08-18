import type { Metadata } from 'next';
import Link from 'next/link';
import { LABS, LAB_GROUPS } from '@/lib/labs';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Labs',
  description:
    'Every station in the workshop: the full Bridge, the Translator, Calibrate, the Agent Tuner, the MCP server, and the research scorecard behind them.',
};

export default function LabsPage() {
  return (
    <div className="bg-[#070b14] text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-sky-400">
          Labs
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          The workshop behind the box
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
          {BRAND_NAME} fronts one thing: the box. Everything it grew out of is
          still here, live at its original address.
        </p>

        {LAB_GROUPS.map((group) => (
          <section key={group} className="mt-12">
            <h2 className="text-xs font-mono uppercase tracking-[0.24em] text-white/40">
              {group}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LABS.filter((l) => l.group === group).map((lab) => (
                <Link
                  key={lab.href}
                  href={lab.href}
                  className="group rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
                >
                  <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">
                    {lab.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {lab.desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
