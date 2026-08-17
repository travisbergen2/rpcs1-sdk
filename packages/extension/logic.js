// logic.js — pure decision + span-location logic, shared by content.js and
// the node test suite. No DOM, no chrome.* in this file.
//
// Field names verified against packages/core/src/translator.ts
// (TranslationOutput) and a live POST to https://rpcs1.dev/api/translate.

// ── AR semantics (verified against resolveAmbiguity in translator.ts) ──────
//
// The AR scale is NOT ordinal in severity:
//   AR0/AR1 -> resolver collapsed confidently.
//   AR4     -> "collapsed but thin margin at high stakes" OR "nearly collapsed".
//   AR3     -> unresolved, readings moderately separated.
//   AR2     -> unresolved, readings close together (MORE ambiguous than AR3/AR4).
//   AR5     -> near-tie between readings — maximum ambiguity.
//
// A numeric "AR3+" gate silently drops AR2 (a strongly forked case) and
// misranks AR4. Gate on set membership, never on the digit.
const FLAG_LEVELS = new Set(["AR2", "AR3", "AR4", "AR5"]);

// ── Per-entity gate ─────────────────────────────────────────────────────────
//
// The engine can collapse the whole message (AR0) and STILL carry an
// unresolved referent — live example: "can you fix that thing before they
// see it" -> ar_level AR0, but candidate "[the thing that needs fixing]".
// A bracketed candidate is the engine's own convention for "a confident
// description of an unknown is still an unknown" (its question rule uses
// exactly this test). So the underline gate is per-entity:
function isUnresolvedEntity(e) {
  if (!e || typeof e.original !== "string" || !e.original) return false;
  const c = e.candidate || {};
  const placeholder = typeof c.text === "string" && c.text.startsWith("[");
  const lowConfidence = typeof c.confidence === "number" && c.confidence < 0.75;
  return placeholder || lowConfidence;
}

// Whole-message fork (unresolved competing readings) — used for the
// field-level badge when there is no specific span to underline.
function messageForks(result) {
  return !!result && FLAG_LEVELS.has(result.ar_level);
}

function unresolvedEntities(result) {
  const ents = result && Array.isArray(result.recovered_entities)
    ? result.recovered_entities
    : [];
  return ents.filter(isUnresolvedEntity);
}

function shouldFlag(result) {
  if (!result || typeof result !== "object") return false;
  return unresolvedEntities(result).length > 0 || messageForks(result);
}

// ── Span location ───────────────────────────────────────────────────────────
//
// The engine returns entity surface strings (`original`), not character
// offsets. Rules mode emits single lowercase words ("that"); model mode can
// emit multi-word phrases ("that thing"). Match case-insensitively on word
// boundaries; first occurrence (mirrors the engine's one-per-surface rule).
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary anchors only where the surface actually starts/ends with a
// word character ("\b" next to "(" can never match).
function surfaceRegex(word) {
  const lead = /^\w/.test(word) ? "\\b" : "";
  const tail = /\w$/.test(word) ? "\\b" : "";
  return new RegExp(lead + escapeRegExp(word) + tail, "i");
}

function locateEntitySpans(text, entities) {
  const spans = [];
  for (const e of entities || []) {
    const word = e && e.original;
    if (!word) continue;
    const re = surfaceRegex(word);
    const m = re.exec(text);
    if (m) {
      spans.push({ start: m.index, end: m.index + m[0].length, word: m[0], entity: e });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  return spans;
}

// ── Hover-card copy ─────────────────────────────────────────────────────────
//
// Copy rule: attribute the ambiguity to the STRING, never to the person.
// "This phrase can land more than one way" is an observation about words;
// nobody defends a sentence.
function buildCardModel(result) {
  const questions = Array.isArray(result.clarifying_questions)
    ? result.clarifying_questions
    : [];
  const paraphrases = Array.isArray(result.reading_paraphrases)
    ? result.reading_paraphrases
    : [];
  const readsAs =
    result.canonical_translation &&
    result.canonical_translation !== result.original
      ? result.canonical_translation
      : null;
  return {
    headline: "This phrase can land more than one way.",
    subline: "You know what it points to; a reader only has the words.",
    readings: paraphrases.slice(0, 3),
    readsAs,
    questions: questions.slice(0, 2),
    engine: result.engine || "rules",
    arLevel: result.ar_level || ""
  };
}

// Pick the clarifying question that mentions this entity, if one does.
function questionForEntity(result, entityOriginal) {
  const qs = Array.isArray(result.clarifying_questions)
    ? result.clarifying_questions
    : [];
  const needle = String(entityOriginal || "").toLowerCase();
  return qs.find((q) => q.toLowerCase().includes(needle)) || qs[0] || null;
}

// ── Engine gate (calibration finding, 2026-08-15) ───────────────────────────
//
// Calibrated on the misread corpus (24 real misread-preceding messages,
// 24 non-event controls from the same conversations, 4 register-misread
// quotes): the RULES path flagged 47/47 items INCLUDING ALL CONTROLS —
// a pronoun-list detector has no discrimination on conversational text
// (ORIG−CTRL gap = 0 at 100%). The model path (gateway:*) declined to flag
// 2/5 real items, i.e. it can at least say "clean"; its control arm is
// unmeasured (per-IP budget exhausted mid-run — interleave sets next time).
//
// Consequence: UI renders ONLY from model-path results by default. A
// rules-path result is budget-fallback noise for this feature — an amber
// line on literally every message is wallpaper, and wallpaper trains users
// to ignore the one flag that matters.
function shouldRender(result, opts = {}) {
  if (!result || typeof result !== "object") return false;
  const engineGate = opts.engineGate !== false; // default ON
  if (engineGate) {
    const eng = result.engine;
    if (!eng || eng === "rules") return false;
  }
  return shouldFlag(result);
}

// ── Receiver-side fork model ────────────────────────────────────────────────
//
// Client-side composition for the fallback path (tool:"interpret") that
// mirrors the shape of core's buildForkView (tool:"fork"), so the fork card
// renders identically whether or not the server fork endpoint has deployed.

function truncateReading(s, max = 90) {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function composeBranchQuestion(branches) {
  if (!Array.isArray(branches) || branches.length < 2) return null;
  return `Quick check — do you mean "${truncateReading(branches[0].summary)}", or "${truncateReading(branches[1].summary)}"?`;
}

function composeForkedScaffold(branches) {
  if (!Array.isArray(branches) || branches.length < 2) return null;
  return `If you mean "${truncateReading(branches[0].summary)}":\n\nIf you mean "${truncateReading(branches[1].summary)}":\n`;
}

// Build a fork-view model from a raw interpret() result (fallback path).
// Engine gate carried over from the 2026-08-15 calibration: on the rules
// path we return status "budget" — the card says "out of deep checks",
// never a pronoun-list fork (rules flagged 47/47 items incl. all controls).
function buildForkModel(data) {
  if (!data || typeof data !== "object") {
    return { status: "error", branches: [], branch_question: null, forked_answer_scaffold: null, ask_backs: [], engine: "?", ar_level: "" };
  }
  const engine = data.engine || "rules";
  if (engine === "rules") {
    return { status: "budget", branches: [], branch_question: null, forked_answer_scaffold: null, ask_backs: [], canonical: null, unresolved: [], engine, ar_level: data.ar_level || "" };
  }

  const seen = new Set();
  const branches = [];
  const paraphrases = Array.isArray(data.reading_paraphrases) ? data.reading_paraphrases : [];
  for (const p of paraphrases) {
    const s = typeof p === "string" ? p.trim() : "";
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    branches.push({ id: `model:${branches.length + 1}`, source: "model", summary: s, canonical: s, consequence: null });
    if (branches.length >= 4) break;
  }

  const askBacks = Array.isArray(data.clarifying_questions) ? data.clarifying_questions.slice(0, 2) : [];
  const unresolved = unresolvedEntities(data).map((e) => e.original);

  let status;
  if (branches.length >= 2) status = "forks";
  else if (unresolved.length > 0) status = "referent";
  else status = "clean";

  return {
    status,
    branches,
    branch_question: composeBranchQuestion(branches) || askBacks[0] || null,
    forked_answer_scaffold: composeForkedScaffold(branches),
    ask_backs: askBacks,
    canonical:
      data.canonical_translation && data.canonical_translation !== data.original
        ? data.canonical_translation
        : null,
    unresolved,
    engine,
    ar_level: data.ar_level || ""
  };
}

// Normalize either background payload mode into the single card model.
function normalizeForkPayload(payload) {
  if (!payload || payload.mode === "error") {
    return { status: "error", error: (payload && payload.error) || "no response", branches: [], branch_question: null, forked_answer_scaffold: null, ask_backs: [], engine: "?", ar_level: "" };
  }
  if (payload.mode === "fork") {
    const d = payload.data || {};
    return {
      status: d.status || "clean",
      branches: Array.isArray(d.branches) ? d.branches : [],
      branch_question: d.branch_question || null,
      forked_answer_scaffold: d.forked_answer_scaffold || null,
      ask_backs: Array.isArray(d.ask_backs) ? d.ask_backs : [],
      canonical: null,
      unresolved: [],
      engine: d.engine || "?",
      ar_level: d.ar_level || ""
    };
  }
  return buildForkModel(payload.data);
}

// ── v0.5 picker logic (sender-side three-exit picker) ──────────────────────

// Passive underlining keys on deterministic mirror SPANS (floor mode, zero
// model budget). CAL-1/2 killed entity-gate flagging; mirror's silence
// contract is the calibrated passive signal.
function shouldUnderline(forkData) {
  return !!forkData && Array.isArray(forkData.spans) && forkData.spans.length > 0;
}

function buildPickerModel(forkData) {
  const branches = (forkData && Array.isArray(forkData.branches) ? forkData.branches : [])
    .filter((b) => b && b.summary)
    .map((b) => ({
      id: b.id,
      source: b.source,
      summary: b.summary,
      clarifier: b.clarifier || null,
      consequence: b.consequence || null
    }));
  return {
    branches,
    engine: (forkData && forkData.engine) || "?",
    status: (forkData && forkData.status) || "clean"
  };
}

// Deterministic gloss merge — identical composition to the server's model
// branches. The user's own words are ground truth; we only frame them.
function composeGlossClarifier(gloss) {
  const g = typeof gloss === "string" ? gloss.trim().replace(/[.\s]+$/, "") : "";
  return g ? `To be clear: I mean ${g}.` : null;
}

function mergeRejected(prev, branches) {
  const set = new Set(prev || []);
  for (const b of branches || []) if (b && b.summary) set.add(b.summary);
  return [...set].slice(0, 12);
}

const RPCS1_LOGIC = {
  FLAG_LEVELS,
  isUnresolvedEntity,
  messageForks,
  unresolvedEntities,
  shouldFlag,
  shouldRender,
  truncateReading,
  composeBranchQuestion,
  composeForkedScaffold,
  buildForkModel,
  normalizeForkPayload,
  shouldUnderline,
  buildPickerModel,
  composeGlossClarifier,
  mergeRejected,
  escapeRegExp,
  surfaceRegex,
  locateEntitySpans,
  buildCardModel,
  questionForEntity
};

if (typeof module !== "undefined" && module.exports) module.exports = RPCS1_LOGIC;
if (typeof globalThis !== "undefined") globalThis.RPCS1_LOGIC = RPCS1_LOGIC;
