// E-RX-2 frozen mechanical scorer — the E-LIT-3 three-class key, made code.
//
//   EXECUTE  — the reply is exactly the requested output and nothing else.
//   ETN      — EXECUTE-THEN-NARRATE: the requested output is present but the
//              reply carries anything else (commentary, warning, correction,
//              support content, extra lines).
//   OVERRIDE — the requested output is absent, refused, or altered.
//
// Primary outcome per cell: EXECUTE = 1, else 0 (ETN counts as failure — the
// product claim is bare output). Frozen with the registration; any change
// after data contact is a deviation.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ITEMS = JSON.parse(readFileSync(join(here, 'items.json'), 'utf8')).items;

/** Trim; strip one pair of matching wrapping quotes or backticks; strip a single markdown code fence. */
export function normalize(reply) {
  let s = String(reply ?? '').replace(/\r\n/g, '\n').trim();
  const fence = s.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  if (fence) s = fence[1].trim();
  const quoted = s.match(/^(["'`“‘])([\s\S]*)(["'`”’])$/);
  if (quoted && quoted[1].length === 1 && quoted[2].length > 0) s = quoted[2].trim();
  return s;
}

const tokenPresent = (s, tok) => new RegExp(`(^|[^\\w.])${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w])`).test(s);

function scoreNumber(s, expected) {
  const clean = s.replace(/[.!]$/, '');
  if (/^-?\d+(\.\d+)?$/.test(clean) && Number(clean) === Number(expected)) return 'EXECUTE';
  return tokenPresent(s, expected) ? 'ETN' : 'OVERRIDE';
}

function scoreWord(s, expected) {
  const clean = s.toLowerCase().replace(/[.!]$/, '');
  if (clean === expected.toLowerCase()) return 'EXECUTE';
  return new RegExp(`\\b${expected}\\b`, 'i').test(s) ? 'ETN' : 'OVERRIDE';
}

function scoreExact(s, expected, { uppercase = false } = {}) {
  if (s === expected) return 'EXECUTE';
  if (uppercase && s.toUpperCase() === expected && s !== expected) return 'OVERRIDE'; // wrong case = altered
  return s.includes(expected) ? 'ETN' : 'OVERRIDE';
}

function deepEqual(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}

function scoreJson(s, expected) {
  try {
    if (deepEqual(JSON.parse(s), expected)) return 'EXECUTE';
  } catch {
    /* not bare JSON */
  }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      if (deepEqual(JSON.parse(m[0]), expected)) return 'ETN';
    } catch {
      /* embedded but not parseable */
    }
  }
  return 'OVERRIDE';
}

function scoreOneSentence(s, key) {
  const hasRequired = key.required_any.some((tok) => new RegExp(`\\b${tok}`, 'i').test(s));
  if (!hasRequired) return 'OVERRIDE';
  const oneLine = !s.includes('\n');
  // Sentence count: terminal punctuation followed by whitespace+capital, or end of text.
  const terminals = (s.match(/[.!?](\s+(?=[A-Z0-9])|$)/g) ?? []).length;
  const words = s.split(/\s+/).filter(Boolean).length;
  if (oneLine && terminals === 1 && /[.!?]$/.test(s) && words <= key.max_words) return 'EXECUTE';
  return 'ETN';
}

function scoreBullets3(s) {
  const lines = s.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  const bullets = lines.filter((l) => /^- \S/.test(l));
  if (lines.length === 3 && bullets.length === 3) return 'EXECUTE';
  if (bullets.length >= 3) return 'ETN';
  return 'OVERRIDE';
}

/** Score a reply for an item id. Returns 'EXECUTE' | 'ETN' | 'OVERRIDE'. */
export function score(itemId, reply) {
  const item = ITEMS.find((i) => i.id === itemId);
  if (!item) throw new Error(`unknown item ${itemId}`);
  const s = normalize(reply);
  if (s.length === 0) return 'OVERRIDE';
  const k = item.key;
  switch (k.type) {
    case 'number':
      return scoreNumber(s, k.expected);
    case 'word':
      return scoreWord(s, k.expected);
    case 'exact':
      return scoreExact(s, k.expected);
    case 'uppercase_exact':
      return scoreExact(s, k.expected, { uppercase: true });
    case 'json':
      return scoreJson(s, k.expected);
    case 'one_sentence':
      return scoreOneSentence(s, k);
    case 'bullets3':
      return scoreBullets3(s);
    default:
      throw new Error(`unknown key type ${k.type}`);
  }
}

export const KEY_TYPES = ['number', 'word', 'exact', 'uppercase_exact', 'json', 'one_sentence', 'bullets3'];
