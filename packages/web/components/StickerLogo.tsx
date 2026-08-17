import { BRAND_NAME, BRAND_TAGLINE, brandLines } from '@/lib/brand';

/**
 * StickerLogo — the advisory-sticker wordmark.
 *
 * A deliberate, legally distinct homage to the advisory-sticker aesthetic —
 * NOT a copy of the RIAA parental-advisory label (a registered trademark):
 * different proportions, a double-ring border, three lines instead of two,
 * and our own bottom line. The joke is the brand: communication that earns
 * the EXPLICIT sticker because it says what it means.
 */
export function StickerLogo({ size = 'nav' }: { size?: 'nav' | 'hero' }) {
  const lines = brandLines();

  if (size === 'nav') {
    return (
      <span
        aria-label={BRAND_NAME}
        className="inline-flex select-none flex-col items-center border-2 border-white bg-black px-1.5 py-1 leading-none"
      >
        {lines.map((l, i) => (
          <span
            key={i}
            className="text-[8px] font-black uppercase tracking-[0.16em] text-white"
          >
            {l}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      aria-label={BRAND_NAME}
      className="inline-flex select-none flex-col items-center rounded-[3px] border-4 border-white bg-black px-7 py-5 shadow-[0_0_0_3px_#000,0_8px_40px_rgba(0,0,0,0.6)]"
    >
      {lines.map((l, i) => (
        <span
          key={i}
          className="text-3xl font-black uppercase leading-[1.08] tracking-[0.18em] text-white sm:text-4xl"
        >
          {l}
        </span>
      ))}
      <span className="mt-2.5 border-t-2 border-white pt-2 text-[10px] font-bold uppercase tracking-[0.32em] text-white/90">
        {BRAND_TAGLINE.replace(/\.$/, '')}
      </span>
    </span>
  );
}
