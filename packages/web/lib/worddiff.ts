/**
 * worddiff — word-level LCS diff for the Bridge dial preview.
 *
 * Purpose (E-INT-1 miss anatomy): the panel's only misses were judges
 * confusing WHICH short clause a dial removed (urgency vs register) when the
 * two clauses are near-twins. The fix is showing, on the original text,
 * exactly which words each dial position removed or relocated. Deterministic,
 * O(n·m) on words — prompts are short, so this is instant.
 */

export interface DiffToken {
  text: string;
  /** true when this token from the BASE text is absent (or relocated) in the result */
  removed: boolean;
}

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

/**
 * Mark which base-text words do not survive (in order) into the result text.
 * Standard LCS over word tokens; base words outside the LCS are `removed`.
 * Relocated words (e.g. constraints moved into a leading block) count as
 * removed-from-here, which is exactly what the preview needs to show.
 */
export function diffBase(base: string, result: string): DiffToken[] {
  const a = tokenize(base);
  const b = tokenize(result);
  const n = a.length;
  const m = b.length;
  if (n === 0) return [];
  if (n * m > 250_000) {
    // Pathologically long input — degrade gracefully to "no highlights"
    return a.map((text) => ({ text, removed: false }));
  }
  // LCS table
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  // Walk: base tokens on the LCS path are kept; the rest are removed.
  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ text: a[i], removed: false });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ text: a[i], removed: true });
      i++;
    } else {
      j++;
    }
  }
  while (i < n) { out.push({ text: a[i], removed: true }); i++; }
  return out;
}
