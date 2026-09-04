import Link from 'next/link';
import Instrument from '@/components/Instrument';

/**
 * The homepage is the instrument, not a description of it (Travis, 2026-09-04:
 * "it should be just interface"). Two panes, five dials, one send row, one
 * info bubble — see components/Instrument.tsx. Below it: where the instrument
 * connects (your notes in Obsidian, the reply leg, everything else). No beats,
 * no pitch sections, no offer copy; organizations find licensing via the nav
 * and footer, which are site-wide and unchanged here.
 */
export default function HomePage() {
  return (
    <div className="bg-[#070b14] text-white">
      <Instrument />

      <nav aria-label="Where this connects" className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link
              href="/connect"
              className="inline-flex min-h-11 items-center text-sky-300 underline-offset-4 hover:underline"
            >
              Ground it in your notes — your Obsidian vault, inside the AI you already use →
            </Link>
          </li>
          <li>
            <Link
              href="/bridge"
              className="inline-flex min-h-11 items-center text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              Bring a reply back and read it your way →
            </Link>
          </li>
          <li>
            <Link
              href="/labs"
              className="inline-flex min-h-11 items-center text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              Everything else →
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
