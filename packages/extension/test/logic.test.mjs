// Unit tests for the pure decision/span logic.
// Run: node --test test/
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const L = require("../logic.js");

// ── Fixture: verbatim live response from https://rpcs1.dev/api/translate
// (2026-08-15, engine gateway:openai/gpt-4o-mini). AR0 — the resolver
// collapsed — yet the referent is a bracketed placeholder. This is the case
// an "AR level only" gate misses.
const LIVE_AR0_PLACEHOLDER = {
  original: "can you fix that thing before they see it",
  recovered_entities: [
    {
      original: "that thing",
      category: "unspecified",
      candidate: { text: "[the thing that needs fixing]", confidence: 0.6 },
      alternatives: []
    }
  ],
  recovered_intent: { type: "instruction", confidence: 0.9 },
  canonical_translation: "Can you fix [the thing that needs fixing] before they see it?",
  translation_integrity: 90,
  confidence: 0.71,
  ar_level: "AR0",
  playback_required: true,
  clarifying_questions: ['What does "that thing" refer to?'],
  candidates: [{ text: "[the thing that needs fixing]", confidence: 0.6 }],
  margin: 0.71,
  engine: "gateway:openai/gpt-4o-mini",
  reading_paraphrases: ["Can you repair the item that needs fixing before they notice it?"]
};

test("AR0 with a bracketed placeholder referent still flags (live fixture)", () => {
  assert.equal(L.shouldFlag(LIVE_AR0_PLACEHOLDER), true);
  assert.equal(L.unresolvedEntities(LIVE_AR0_PLACEHOLDER).length, 1);
});

test("AR0 with a confidently resolved entity does not flag", () => {
  const r = {
    ar_level: "AR0",
    recovered_entities: [
      { original: "it", candidate: { text: "the quarterly report", confidence: 0.9 } }
    ]
  };
  assert.equal(L.shouldFlag(r), false);
});

test("low-confidence non-placeholder entity flags", () => {
  const r = {
    ar_level: "AR1",
    recovered_entities: [
      { original: "they", candidate: { text: "the vendors", confidence: 0.5 } }
    ]
  };
  assert.equal(L.shouldFlag(r), true);
});

test("AR2 must flag — a numeric 'AR3+' gate would silently miss it", () => {
  // Verified against resolveAmbiguity: within the no-collapse branch,
  // AR2 means the readings are CLOSER together than AR3/AR4. The scale is
  // not ordinal in severity; gate on membership.
  const r = { ar_level: "AR2", recovered_entities: [] };
  assert.equal(L.messageForks(r), true);
  assert.equal(L.shouldFlag(r), true);
});

test("AR5 (near-tie, maximum ambiguity) flags", () => {
  assert.equal(L.shouldFlag({ ar_level: "AR5", recovered_entities: [] }), true);
});

test("AR1 with no entities stays silent", () => {
  assert.equal(L.shouldFlag({ ar_level: "AR1", recovered_entities: [] }), false);
});

test("garbage input never flags", () => {
  assert.equal(L.shouldFlag(null), false);
  assert.equal(L.shouldFlag(undefined), false);
  assert.equal(L.shouldFlag({}), false);
  assert.equal(L.shouldFlag({ ar_level: "banana" }), false);
});

// ── Engine gate (calibration regression, 2026-08-15) ────────────────────────
// Rules path flagged 47/47 calibration items including all controls; UI must
// only render from model-path results by default.

test("rules-engine results never render, even when flag-worthy", () => {
  const r = {
    engine: "rules",
    ar_level: "AR3",
    recovered_entities: [
      { original: "that", candidate: { text: "[unspecified referent]", confidence: 0.5 } }
    ]
  };
  assert.equal(L.shouldFlag(r), true); // still flag-worthy in the abstract
  assert.equal(L.shouldRender(r), false); // but never rendered
});

test("model-path results render when flag-worthy (live fixture)", () => {
  assert.equal(L.shouldRender(LIVE_AR0_PLACEHOLDER), true);
});

test("missing engine field is treated as rules (conservative)", () => {
  const r = {
    ar_level: "AR5",
    recovered_entities: [
      { original: "it", candidate: { text: "[unknown object/topic]", confidence: 0.5 } }
    ]
  };
  assert.equal(L.shouldRender(r), false);
});

test("engine gate can be explicitly disabled", () => {
  const r = {
    engine: "rules",
    ar_level: "AR5",
    recovered_entities: [
      { original: "it", candidate: { text: "[unknown object/topic]", confidence: 0.5 } }
    ]
  };
  assert.equal(L.shouldRender(r, { engineGate: false }), true);
});

test("model-path clean results still do not render", () => {
  const r = {
    engine: "gateway:openai/gpt-4o-mini",
    ar_level: "AR1",
    recovered_entities: []
  };
  assert.equal(L.shouldRender(r), false);
});

// ── Span location ───────────────────────────────────────────────────────────

test("locates entity case-insensitively (engine emits lowercase; drafts capitalize)", () => {
  const spans = L.locateEntitySpans("That report is late.", [
    { original: "that", candidate: { text: "[unspecified referent]", confidence: 0.5 } }
  ]);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].start, 0);
  assert.equal(spans[0].word, "That");
});

test("respects word boundaries ('theirs' must not match 'their')", () => {
  const spans = L.locateEntitySpans("theirs alone", [{ original: "their" }]);
  assert.equal(spans.length, 0);
});

test("locates multi-word phrases (model mode emits them)", () => {
  const spans = L.locateEntitySpans("fix That Thing today", [{ original: "that thing" }]);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].word, "That Thing");
});

test("multiple entities come back sorted by position; absent words skipped", () => {
  const spans = L.locateEntitySpans("tell them it broke", [
    { original: "it" },
    { original: "them" },
    { original: "somewhere" }
  ]);
  assert.deepEqual(spans.map((s) => s.word), ["them", "it"]);
});

test("regex metacharacters in a surface string do not crash matching", () => {
  const spans = L.locateEntitySpans("the (thing) broke", [{ original: "(thing)" }]);
  assert.equal(spans.length, 1);
});

// ── Card model ──────────────────────────────────────────────────────────────

test("card model caps questions at 2 and readings at 3", () => {
  const m = L.buildCardModel({
    original: "x",
    canonical_translation: "y",
    clarifying_questions: ["q1", "q2", "q3"],
    reading_paraphrases: ["r1", "r2", "r3", "r4"]
  });
  assert.equal(m.questions.length, 2);
  assert.equal(m.readings.length, 3);
  assert.equal(m.readsAs, "y");
});

test("card model suppresses reads-as when canonical equals original", () => {
  const m = L.buildCardModel({ original: "same", canonical_translation: "same" });
  assert.equal(m.readsAs, null);
  assert.equal(m.engine, "rules");
});

test("questionForEntity prefers the question naming the entity", () => {
  const r = {
    clarifying_questions: ['What does "it" refer to?', 'What does "that thing" refer to?']
  };
  assert.equal(L.questionForEntity(r, "that thing"), 'What does "that thing" refer to?');
  assert.equal(L.questionForEntity(r, "unmentioned"), 'What does "it" refer to?');
});
