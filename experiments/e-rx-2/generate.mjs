// E-RX-2 arm generator — rule application, no creativity.
//
// Reads items.json, subjects.json, rules.json; writes arms.json (every
// subject × item × arm text with its sha256 and provenance) and MANIFEST.json
// (hashes of the inputs and of arms.json). Deterministic: identical inputs →
// identical bytes. The test suite regenerates into a temp dir and compares.
//
// Arms: A (naive), B-full (E-RX-1 anchor: T-URG, T-REG, T-FENCE, T-LIC, T-NOC),
// B-own (the subject's own implied set), B-swap (the swap partner's set),
// C (placebo: naive + generic precision sentences length-matched to B-own's
// inserted characters, ±10%; never removes anything, never restates a
// constraint).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ? process.argv[2] : here;

const items = JSON.parse(readFileSync(join(here, 'items.json'), 'utf8')).items;
const subjectsFile = JSON.parse(readFileSync(join(here, 'subjects.json'), 'utf8'));
const rules = JSON.parse(readFileSync(join(here, 'rules.json'), 'utf8'));

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Delete each declared substring exactly once; throw if absent (the declaration must match the naive text). */
function deleteClauses(text, clauses, label, itemId) {
  let out = text;
  for (const c of clauses) {
    const i = out.indexOf(c);
    if (i === -1) throw new Error(`${itemId}: ${label} clause not found verbatim: ${JSON.stringify(c)}`);
    out = out.slice(0, i) + out.slice(i + c.length);
  }
  return out;
}

/** Apply a transformation set to an item in the frozen order; returns text + accounting. */
export function applySet(item, set) {
  const active = rules.order.filter((t) => set.includes(t));
  if (active.includes('T-FENCE') && active.includes('T-FENCE-min')) {
    throw new Error(`${item.id}: a set may not contain both T-FENCE and T-FENCE-min`);
  }
  let body = item.naive;
  let inserted = 0;
  let deleted = 0;
  const applied = [];
  for (const t of active) {
    switch (t) {
      case 'T-URG': {
        if (item.urgency.length) {
          const before = body.length;
          body = deleteClauses(body, item.urgency, 'urgency', item.id);
          deleted += before - body.length;
          applied.push(t);
        }
        break;
      }
      case 'T-REG': {
        if (item.register.length) {
          const before = body.length;
          body = deleteClauses(body, item.register, 'register', item.id);
          deleted += before - body.length;
          applied.push(t);
        }
        break;
      }
      case 'T-FENCE': {
        const block = `${rules.fence_block_header}\n${item.constraints.map((c) => `- ${c}`).join('\n')}\n\n`;
        body = block + body;
        inserted += block.length;
        applied.push(t);
        break;
      }
      case 'T-FENCE-min': {
        const s = `\n\n${item.fence_min}`;
        body = body + s;
        inserted += s.length;
        applied.push(t);
        break;
      }
      case 'T-LIC': {
        if (item.license) {
          const s = `${item.license}\n\n`;
          body = s + body;
          inserted += s.length;
          applied.push(t);
        }
        break;
      }
      case 'T-STAKES': {
        if (item.stakes) {
          const s = `\n\n${item.stakes}`;
          body = body + s;
          inserted += s.length;
          applied.push(t);
        }
        break;
      }
      case 'T-NOC': {
        const s = `\n\n${rules.noc_sentence}`;
        body = body + s;
        inserted += s.length;
        applied.push(t);
        break;
      }
      default:
        throw new Error(`unknown transformation ${t}`);
    }
  }
  return { text: body, inserted, deleted, applied };
}

/**
 * Placebo: naive + the combination of pool sentences whose total length is
 * closest to `target` (the B-own inserted characters), each sentence used at
 * most once, preserving pool order. Never deletes, never restates a constraint.
 */
export function placebo(item, target) {
  const pool = rules.placebo_pool;
  let best = null;
  const n = pool.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const chosen = pool.filter((_, i) => mask & (1 << i));
    const len = chosen.join(' ').length + 2; // "\n\n" separator counts as inserted
    const d = Math.abs(len - target);
    if (!best || d < best.d || (d === best.d && chosen.length < best.chosen.length)) best = { chosen, len, d };
  }
  const text = `${item.naive}\n\n${best.chosen.join(' ')}`;
  const withinTolerance = target > 0 && best.d <= rules.placebo_tolerance * target;
  return {
    text,
    inserted: best.len,
    target,
    sentences: best.chosen,
    length_rule: target <= 0 ? 'n/a (own arm inserted nothing)' : withinTolerance ? 'within ±10%' : `OUT OF TOLERANCE (|${best.len}-${target}| > 10%)`,
  };
}

export function generate() {
  const arms = [];
  for (const subject of subjectsFile.subjects) {
    for (const item of items) {
      const A = { text: item.naive, inserted: 0, deleted: 0, applied: [] };
      const full = applySet(item, rules.anchor_set);
      const own = applySet(item, subject.own_set);
      const swap = applySet(item, subject.swap_set);
      const C = placebo(item, own.inserted);
      const push = (arm, r, extra = {}) =>
        arms.push({
          subject: subject.label,
          model_key: subject.model_key,
          item: item.id,
          arm,
          text: r.text,
          sha256: sha256(r.text),
          applied: r.applied ?? [],
          inserted_chars: r.inserted,
          deleted_chars: r.deleted ?? 0,
          ...extra,
        });
      push('A', A, { shared_across_subjects: true });
      push('B-full', full, { shared_across_subjects: true, set: rules.anchor_set });
      push('B-own', own, { set: subject.own_set });
      push('B-swap', swap, { set: subject.swap_set, swap_partner: subject.swap_partner });
      push('C', C, { placebo_target_chars: C.target, placebo_sentences: C.sentences, placebo_length_rule: C.length_rule });
    }
  }
  return arms;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(outDir, { recursive: true });
  const arms = generate();
  const armsJson = JSON.stringify(arms, null, 2) + '\n';
  writeFileSync(join(outDir, 'arms.json'), armsJson);
  const manifest = {
    experiment: 'E-RX-2',
    frozen_at: '2026-09-05T22:45:00-05:00',
    generator: 'experiments/e-rx-2/generate.mjs',
    inputs: {
      'items.json': sha256(readFileSync(join(here, 'items.json'), 'utf8')),
      'subjects.json': sha256(readFileSync(join(here, 'subjects.json'), 'utf8')),
      'rules.json': sha256(readFileSync(join(here, 'rules.json'), 'utf8')),
      'score.mjs': sha256(readFileSync(join(here, 'score.mjs'), 'utf8')),
    },
    'arms.json': sha256(armsJson),
    counts: {
      arms: arms.length,
      distinct_texts: new Set(arms.map((a) => a.sha256)).size,
      subjects: subjectsFile.subjects.length,
      items: items.length,
      differential_items: items.filter((i) => i.differential).length,
    },
  };
  writeFileSync(join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`arms: ${arms.length} (${manifest.counts.distinct_texts} distinct texts); arms.json sha256 ${manifest['arms.json']}`);
}
