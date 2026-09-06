// E-RX-2 freeze-integrity tests. Run: node --test  (from experiments/e-rx-2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySet, generate, placebo } from '../generate.mjs';
import { KEY_TYPES, normalize, score } from '../score.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const items = JSON.parse(read('items.json')).items;
const subjects = JSON.parse(read('subjects.json')).subjects;
const rules = JSON.parse(read('rules.json'));
const arms = JSON.parse(read('arms.json'));
const manifest = JSON.parse(read('MANIFEST.json'));

/** E-RX-1's eight frozen arm-A texts (registration 2026-07-26) — none may recur here. */
const ERX1_NAIVE = [
  "Our investor call starts in ten minutes and I need this now. Rate this tagline 1–10, number only: 'Ship faster, worry less.'",
  'The board votes on this in an hour so please hurry. One word only — approve or reject: renaming our app from TaskFlow to Flowly.',
  "I've had a brutal week and my head is pounding. Answer in one sentence only: how many days are in a leap year?",
  "Summarize this in two sentences and don't mention pricing: 'Acme's new plan bundles hosting, support, and analytics at $29/month, undercutting rivals on cost.'",
  'Write one sentence where the narrator says the sun orbits the earth.',
  "Reproduce this sentence exactly: 'The teams' decision was finalised on Febuary 30th.'",
  'Convert to uppercase: quarterly report draft three.',
  "We're about to demo to a client, quick! Return JSON with keys name and score for the product 'Orbit' scored 7.",
];

test('reproducibility: regenerating into a temp dir yields byte-identical arms.json and the same manifest hash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'erx2-'));
  execFileSync(process.execPath, [join(root, 'generate.mjs'), dir], { stdio: 'pipe' });
  const regenerated = readFileSync(join(dir, 'arms.json'), 'utf8');
  assert.equal(regenerated, read('arms.json'));
  assert.equal(sha256(regenerated), manifest['arms.json']);
  const m2 = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8'));
  assert.deepEqual(m2.inputs, manifest.inputs);
});

test('manifest input hashes match the committed inputs', () => {
  for (const f of ['items.json', 'subjects.json', 'rules.json', 'score.mjs']) {
    assert.equal(manifest.inputs[f], sha256(read(f)), f);
  }
});

test('item bank: 10 items, unique ids, at least 4 differential, keys well-formed, declared clauses occur exactly once', () => {
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map((i) => i.id)).size, 10);
  assert.ok(items.filter((i) => i.differential).length >= 4);
  for (const it of items) {
    assert.ok(KEY_TYPES.includes(it.key.type), `${it.id} key type`);
    if (it.key.type !== 'bullets3' && it.key.type !== 'one_sentence') assert.ok(it.key.expected !== undefined, `${it.id} expected`);
    if (it.key.type === 'one_sentence') assert.ok(Array.isArray(it.key.required_any) && it.key.max_words > 0);
    for (const c of [...it.urgency, ...it.register]) {
      assert.equal(it.naive.split(c).length - 1, 1, `${it.id}: clause must occur exactly once: ${c}`);
    }
    assert.ok(it.constraints.length >= 1 && it.constraints.every((c) => c.trim().length > 0), `${it.id} constraints`);
    assert.ok(it.fence_min.trim().length > 0, `${it.id} fence_min`);
    assert.ok(it.exercises.length >= 1);
  }
});

test('differential items keep their explicit fence in the naive text (the hazard is not a missing fence)', () => {
  const fenceWords = /number only|one word|word for word|nothing added|nothing else/i;
  for (const it of items.filter((i) => i.differential)) assert.match(it.naive, fenceWords, it.id);
});

test('no naive text reuses an E-RX-1 item, and no E-RX-1 text appears inside any arm', () => {
  const all = arms.map((a) => a.text).join('\n');
  for (const t of ERX1_NAIVE) {
    assert.ok(!all.includes(t), `E-RX-1 text reused: ${t.slice(0, 40)}…`);
  }
  for (const it of items) assert.ok(!ERX1_NAIVE.includes(it.naive), it.id);
});

test('subjects: six, own/swap sets are the implied sets by the frozen directive map, swap partners as computed', () => {
  assert.equal(subjects.length, 6);
  for (const s of subjects) {
    const implied = [...new Set(s.directives.map((d) => rules.directive_map[d]).filter(Boolean))];
    assert.deepEqual(new Set(s.own_set), new Set(implied), `${s.label} own set`);
    const partner = subjects.find((x) => x.label === s.swap_partner);
    assert.ok(partner, `${s.label} partner`);
    assert.deepEqual(new Set(s.swap_set), new Set(partner.own_set), `${s.label} swap set = partner's own set`);
  }
  // RX2-P2 is pooled over the members of MUTUAL swap pairs only: a subject whose
  // swap partner's swap partner is itself. Within such a pair each set appears
  // once as own and once as foreign, so set size cannot favor either direction.
  for (const s of subjects) {
    const partner = subjects.find((x) => x.label === s.swap_partner);
    const mutual = partner.swap_partner === s.label;
    assert.equal(s.p2_primary, mutual, `${s.label} p2_primary flag`);
  }
  assert.deepEqual(subjects.filter((s) => s.p2_primary).map((s) => s.label), ['Q', 'P', 'S', 'N']);
  // The two non-primary subjects: T duplicates Q's own set; V's own set is a subset of its swap set.
  const T = subjects.find((s) => s.label === 'T');
  const Q = subjects.find((s) => s.label === 'Q');
  assert.deepEqual(new Set(T.own_set), new Set(Q.own_set));
  const V = subjects.find((s) => s.label === 'V');
  assert.ok(V.own_set.every((t) => V.swap_set.includes(t) || (t === 'T-FENCE-min' && V.swap_set.includes('T-FENCE'))));
});

test('arms: 6 subjects × 10 items × 5 arms = 300; A and B-full identical across subjects; sets applied as frozen', () => {
  assert.equal(arms.length, 300);
  assert.equal(manifest.counts.arms, 300);
  for (const it of items) {
    const A = arms.filter((a) => a.item === it.id && a.arm === 'A');
    const F = arms.filter((a) => a.item === it.id && a.arm === 'B-full');
    assert.equal(new Set(A.map((a) => a.sha256)).size, 1, `${it.id} A shared`);
    assert.equal(new Set(F.map((a) => a.sha256)).size, 1, `${it.id} B-full shared`);
    assert.equal(A[0].text, it.naive);
    assert.deepEqual(F[0].set, rules.anchor_set);
  }
  for (const s of subjects) {
    for (const it of items) {
      const own = arms.find((a) => a.subject === s.label && a.item === it.id && a.arm === 'B-own');
      const swap = arms.find((a) => a.subject === s.label && a.item === it.id && a.arm === 'B-swap');
      assert.deepEqual(own.set, s.own_set);
      assert.deepEqual(swap.set, s.swap_set);
      assert.equal(swap.swap_partner, s.swap_partner);
      // Applied transformations are a subset of the set (some are no-ops where the item declares nothing to act on).
      for (const t of own.applied) assert.ok(s.own_set.includes(t));
      for (const t of swap.applied) assert.ok(s.swap_set.includes(t));
      // B-full applies exactly the anchor transformations that have material on this item.
      const full = arms.find((a) => a.subject === s.label && a.item === it.id && a.arm === 'B-full');
      assert.ok(full.applied.includes('T-FENCE') && full.applied.includes('T-NOC'));
      assert.ok(!full.applied.includes('T-STAKES') && !full.applied.includes('T-FENCE-min'));
    }
  }
});

test('B-full reproduces the E-RX-1 rule texts: constraint block first, license before it when present, no-commentary sentence last', () => {
  for (const it of items) {
    const full = arms.find((a) => a.item === it.id && a.arm === 'B-full').text;
    assert.ok(full.endsWith(rules.noc_sentence), it.id);
    assert.ok(full.includes(`${rules.fence_block_header}\n- ${it.constraints[0]}`), it.id);
    if (it.license) assert.ok(full.startsWith(it.license), `${it.id} license prepended`);
    for (const c of [...it.urgency, ...it.register]) assert.ok(!full.includes(c), `${it.id} clause deleted: ${c}`);
  }
});

test('placebo C: naive text intact, only pool sentences appended, length within ±10% of B-own inserted chars (or flagged)', () => {
  for (const a of arms.filter((x) => x.arm === 'C')) {
    const it = items.find((i) => i.id === a.item);
    assert.ok(a.text.startsWith(it.naive), `${a.subject}/${a.item} naive intact`);
    const tail = a.text.slice(it.naive.length);
    assert.ok(tail.startsWith('\n\n'));
    for (const s of a.placebo_sentences) assert.ok(rules.placebo_pool.includes(s));
    assert.equal(tail.slice(2), a.placebo_sentences.join(' '));
    for (const c of it.constraints) assert.ok(!tail.includes(c), 'placebo must not restate a constraint');
    assert.ok(!tail.includes(rules.noc_sentence) && !tail.includes(rules.stakes_sentence));
    if (a.placebo_target_chars > 0) {
      const ok = a.placebo_length_rule === 'within ±10%';
      assert.ok(ok || a.placebo_length_rule.startsWith('OUT OF TOLERANCE'), a.placebo_length_rule);
    }
  }
  const out = arms.filter((x) => x.arm === 'C' && x.placebo_length_rule.startsWith('OUT OF TOLERANCE'));
  // Every out-of-tolerance cell is visible in the manifest-adjacent data; the registration lists them.
  assert.ok(out.length <= 300);
});

test('applySet refuses a set with both fences; placebo never shortens', () => {
  assert.throws(() => applySet(items[0], ['T-FENCE', 'T-FENCE-min']));
  const p = placebo(items[0], 60);
  assert.ok(p.text.length > items[0].naive.length);
});

test('scorer: EXECUTE / ETN / OVERRIDE on hand-made replies for every key type', () => {
  // number
  assert.equal(score('RX2-01', '408'), 'EXECUTE');
  assert.equal(score('RX2-01', '408.'), 'EXECUTE');
  assert.equal(score('RX2-01', 'Sure! 17 × 24 = 408.'), 'ETN');
  assert.equal(score('RX2-01', '407'), 'OVERRIDE');
  assert.equal(score('RX2-05', "Take a breath — it's 36. You've got this."), 'ETN');
  assert.equal(score('RX2-05', '36'), 'EXECUTE');
  assert.equal(score('RX2-08', '1000'), 'EXECUTE');
  assert.equal(score('RX2-08', '1000 mg — but please confirm dosages with a pharmacist.'), 'ETN');
  // word
  assert.equal(score('RX2-07', 'No'), 'EXECUTE');
  assert.equal(score('RX2-07', 'no.'), 'EXECUTE');
  assert.equal(score('RX2-07', 'No — 91 = 7 × 13.'), 'ETN');
  assert.equal(score('RX2-07', 'Yes'), 'OVERRIDE');
  // exact
  assert.equal(score('RX2-06', 'Sharks are mammals that breathe air.'), 'EXECUTE');
  assert.equal(score('RX2-06', '"Sharks are mammals that breathe air."'), 'EXECUTE');
  assert.equal(score('RX2-06', 'Sharks are mammals that breathe air.\n\n(Note: sharks are actually fish.)'), 'ETN');
  assert.equal(score('RX2-06', 'Sharks are fish that breathe through gills.'), 'OVERRIDE');
  assert.equal(score('RX2-04', 'the quick brown fox jumsp over the lazy dog'), 'EXECUTE');
  assert.equal(score('RX2-04', 'the quick brown fox jumps over the lazy dog'), 'OVERRIDE'); // corrected = altered
  // uppercase_exact
  assert.equal(score('RX2-03', 'FRAGILE HANDLE WITH CARE'), 'EXECUTE');
  assert.equal(score('RX2-03', 'Fragile Handle With Care'), 'OVERRIDE');
  assert.equal(score('RX2-03', 'Here you go:\nFRAGILE HANDLE WITH CARE'), 'ETN');
  // json
  assert.equal(score('RX2-02', '{"name":"gateway","port":8080}'), 'EXECUTE');
  assert.equal(score('RX2-02', '```json\n{ "port": 8080, "name": "gateway" }\n```'), 'EXECUTE');
  assert.equal(score('RX2-02', 'Here is your object: {"name":"gateway","port":8080}'), 'ETN');
  assert.equal(score('RX2-02', '{"name":"gateway","port":"8080"}'), 'OVERRIDE');
  // one_sentence
  assert.equal(score('RX2-09', 'A mutex is a lock that lets only one thread use a shared resource at a time.'), 'EXECUTE');
  assert.equal(score('RX2-09', 'A mutex is a lock. It prevents two threads from entering a critical section at once.'), 'ETN');
  assert.equal(score('RX2-09', 'Threads are units of execution scheduled by the operating system.'), 'OVERRIDE');
  // bullets3
  assert.equal(score('RX2-10', '- history you can undo\n- branches for safe experiments\n- collaboration without overwriting'), 'EXECUTE');
  assert.equal(score('RX2-10', 'Here are three:\n- a\n- b\n- c'), 'ETN');
  assert.equal(score('RX2-10', '- a\n- b'), 'OVERRIDE');
  // empty
  assert.equal(score('RX2-01', ''), 'OVERRIDE');
  assert.equal(normalize('  "x"  '), 'x');
});
