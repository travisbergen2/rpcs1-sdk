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

// ── Receiver-side fork model ────────────────────────────────────────────────

const mkInterpret = (over = {}) => ({
  original: "should I take the deal or wait",
  recovered_entities: [],
  recovered_intent: { type: "question", confidence: 0.85 },
  canonical_translation: "should I take the deal or wait",
  translation_integrity: 90,
  confidence: 0.7,
  ar_level: "AR3",
  playback_required: false,
  clarifying_questions: [],
  candidates: [],
  margin: 0.2,
  engine: "gateway:openai/gpt-4o-mini",
  ...over
});

test("fork model: rules engine becomes status budget, renders nothing else", () => {
  const m = L.buildForkModel(mkInterpret({ engine: "rules", reading_paraphrases: ["a", "b"] }));
  assert.equal(m.status, "budget");
  assert.equal(m.branches.length, 0);
  assert.equal(m.branch_question, null);
});

test("fork model: two model paraphrases produce forks with question and scaffold", () => {
  const m = L.buildForkModel(
    mkInterpret({ reading_paraphrases: ["Take the deal now", "Wait for a better offer"] })
  );
  assert.equal(m.status, "forks");
  assert.equal(m.branches.length, 2);
  assert.match(m.branch_question, /^Quick check — do you mean "Take the deal now", or "Wait for a better offer"\?$/);
  assert.match(m.forked_answer_scaffold, /^If you mean "Take the deal now":\n\nIf you mean "Wait for a better offer":\n$/);
});

test("fork model: paraphrases dedupe case-insensitively and cap at 4", () => {
  const m = L.buildForkModel(
    mkInterpret({ reading_paraphrases: ["Same reading", "same reading", "B", "C", "D", "E"] })
  );
  assert.equal(m.branches.length, 4);
  assert.equal(m.branches[0].summary, "Same reading");
});

test("fork model: single paraphrase + unresolved entity is status referent with ask-back", () => {
  const m = L.buildForkModel(
    mkInterpret({
      reading_paraphrases: ["Fix the item"],
      recovered_entities: [
        { original: "that thing", candidate: { text: "[the thing]", confidence: 0.6 }, alternatives: [] }
      ],
      clarifying_questions: ['What does "that thing" refer to?']
    })
  );
  assert.equal(m.status, "referent");
  assert.deepEqual(m.unresolved, ["that thing"]);
  assert.equal(m.branch_question, 'What does "that thing" refer to?');
});

test("fork model: clean model result stays clean, canonical suppressed when identical", () => {
  const m = L.buildForkModel(mkInterpret({ ar_level: "AR0" }));
  assert.equal(m.status, "clean");
  assert.equal(m.canonical, null);
  assert.equal(m.forked_answer_scaffold, null);
});

test("fork model: long readings are truncated with ellipsis in the question", () => {
  const long = "x".repeat(200);
  const m = L.buildForkModel(mkInterpret({ reading_paraphrases: [long, "short"] }));
  assert.ok(m.branch_question.includes("…"));
  assert.ok(m.branch_question.length < 240);
});

test("normalizeForkPayload: fork mode passes the server view through", () => {
  const m = L.normalizeForkPayload({
    mode: "fork",
    data: {
      status: "forks",
      branches: [{ id: "mirror:compare_or_choose:a", source: "mirror", summary: "Compare A and B" }],
      branch_question: "Quick check — A or B?",
      forked_answer_scaffold: "If A:\n\nIf B:\n",
      ask_backs: [],
      engine: "mirror+gateway:test"
    }
  });
  assert.equal(m.status, "forks");
  assert.equal(m.engine, "mirror+gateway:test");
  assert.equal(m.branches[0].source, "mirror");
});

test("normalizeForkPayload: interpret mode delegates to buildForkModel", () => {
  const m = L.normalizeForkPayload({
    mode: "interpret",
    data: mkInterpret({ reading_paraphrases: ["A", "B"] })
  });
  assert.equal(m.status, "forks");
});

test("normalizeForkPayload: error mode is status error", () => {
  const m = L.normalizeForkPayload({ mode: "error", error: "boom" });
  assert.equal(m.status, "error");
  assert.equal(m.error, "boom");
});

// ── v0.5 picker logic ───────────────────────────────────────────────────────

test("shouldUnderline keys on mirror spans, not entities or AR", () => {
  assert.equal(L.shouldUnderline({ spans: [{ text: "React or Vue", kind: "compare_or_choose" }] }), true);
  assert.equal(L.shouldUnderline({ spans: [] }), false);
  assert.equal(L.shouldUnderline({ branches: [{ summary: "x" }] }), false);
  assert.equal(L.shouldUnderline(null), false);
});

test("buildPickerModel keeps id/source/summary/clarifier and drops junk", () => {
  const m = L.buildPickerModel({
    engine: "mirror+gateway:test",
    status: "forks",
    branches: [
      { id: "mirror:compare_or_choose:a", source: "mirror", summary: "Compare A and B", clarifier: "To be clear: compare.", consequence: "c" },
      { id: "model:2", source: "model", summary: "" },
      null
    ]
  });
  assert.equal(m.branches.length, 1);
  assert.equal(m.branches[0].clarifier, "To be clear: compare.");
  assert.equal(m.engine, "mirror+gateway:test");
});

test("composeGlossClarifier frames the user's words, trims trailing punctuation", () => {
  assert.equal(L.composeGlossClarifier("the vendor invoice, not the contract."), "To be clear: I mean the vendor invoice, not the contract.");
  assert.equal(L.composeGlossClarifier("   "), null);
  assert.equal(L.composeGlossClarifier(null), null);
});

test("mergeRejected accumulates summaries, dedupes, caps at 12", () => {
  const r1 = L.mergeRejected([], [{ summary: "A" }, { summary: "B" }]);
  const r2 = L.mergeRejected(r1, [{ summary: "B" }, { summary: "C" }]);
  assert.deepEqual(r2, ["A", "B", "C"]);
  const many = Array.from({ length: 20 }, (_, i) => ({ summary: "S" + i }));
  assert.equal(L.mergeRejected([], many).length, 12);
});

test("questionForEntity prefers the question naming the entity", () => {
  const r = {
    clarifying_questions: ['What does "it" refer to?', 'What does "that thing" refer to?']
  };
  assert.equal(L.questionForEntity(r, "that thing"), 'What does "that thing" refer to?');
  assert.equal(L.questionForEntity(r, "unmentioned"), 'What does "it" refer to?');
});
