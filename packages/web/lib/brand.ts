/**
 * Brand token — the consumer-facing identity of the product.
 *
 * The product brand (what users see) is decoupled from the mechanism brand
 * (RPCS-1, which powers it and lives in the footer and the docs). Renaming
 * the product is a one-line change: set NEXT_PUBLIC_BRAND_NAME at build
 * time, or edit the default below.
 *
 * "Explicit Formula" — explicit: says exactly what it means (the product's
 * one job); formula: a repeatable method. Mechanism vocabulary (receiver
 * primitives, profiles, laws) stays one click deep, per the house rule:
 * outcome on the wrapper, mechanism in the docs.
 */
export const BRAND_NAME: string =
  process.env.NEXT_PUBLIC_BRAND_NAME || 'Explicit Formula';

/** The sticker's bottom line and the metadata subtitle. */
export const BRAND_TAGLINE = 'Says what it means.';

/** The hero promise — the outcome, not the mechanism. */
export const BRAND_PROMISE = 'Say it once. Land it right.';

/** The mechanism brand. Always rendered as "Powered by …" in the footer. */
export const POWERED_BY = 'RPCS-1';

/**
 * Split the brand name into sticker lines: one word per line for names of
 * up to three words; longer names collapse to two lines so the sticker
 * stays a sticker.
 */
export function brandLines(name: string = BRAND_NAME): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['—'];
  if (words.length <= 3) return words;
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}
