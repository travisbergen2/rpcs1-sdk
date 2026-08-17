// content.js — watches text fields; on pause-in-typing sends the draft to
// RPCS-1's interpret (via background.js) and flags unresolved referents with
// an amber squiggle + hover card.
//
// ARCHITECTURE RULE — never mutate the editor's DOM.
// Gmail/Slack/Twitter compose boxes are managed editors (ProseMirror-,
// Draft-, Lexical-class): they own their DOM. Wrapping text in foreign
// <span>s desyncs their internal model, strips your spans on next render,
// and drops the caret mid-word. Grammarly-class tools draw a positioned
// OVERLAY instead — underline strips computed from Range.getClientRects()
// on top of the text, in a container we own. That is what this does.
//   - contenteditable: per-span underline strips (overlay).
//   - <textarea>/<input>: no DOM text nodes to Range against, so v0 shows a
//     corner badge + card (the mirror-div trick is the v1 upgrade).

const DEBOUNCE_MS = 700;
const MIN_LEN = 12;      // don't analyze fragments
const MAX_LEN = 4000;    // send the tail beyond this (active sentence lives there)
const RISK_BY_HOST = {
  // Per-platform defaults, e.g.:
  // "mail.google.com": "advice",
  // "app.slack.com": "casual",
};

const L = globalThis.RPCS1_LOGIC;

function riskForThisPage() {
  return RISK_BY_HOST[location.hostname] || "casual";
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function sendBg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) =>
      resolve(response || { ok: false, error: "no response" })
    );
  });
}

// ── Overlay plumbing ────────────────────────────────────────────────────────

let overlayRoot = null;
function getOverlayRoot() {
  if (!overlayRoot || !overlayRoot.isConnected) {
    overlayRoot = document.createElement("div");
    overlayRoot.setAttribute("data-rpcs1-overlay", "");
    overlayRoot.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;";
    document.documentElement.appendChild(overlayRoot);
  }
  return overlayRoot;
}

const bound = new WeakSet();          // fields we've attached listeners to
const fieldState = new WeakMap();     // field -> { lastText, marks, nodes }
const activeFields = new Set();       // fields with visible overlays (for reposition)

function stateFor(el) {
  let st = fieldState.get(el);
  if (!st) {
    st = { lastText: "", marks: [], nodes: [] };
    fieldState.set(el, st);
  }
  return st;
}

function clearOverlays(el) {
  const st = fieldState.get(el);
  if (!st) return;
  st.nodes.forEach((n) => n.remove());
  st.nodes = [];
  st.marks = [];
  activeFields.delete(el);
}

// ── Hover card ──────────────────────────────────────────────────────────────

let activeCard = null;
let hideTimer = null;

function removeCard() {
  if (activeCard) {
    activeCard.remove();
    activeCard = null;
  }
}

function scheduleHideCard() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(removeCard, 250);
}

function esc(s) {
  const div = document.createElement("div");
  div.textContent = s == null ? "" : String(s);
  return div.innerHTML;
}

function showCard(anchorRect, titleText, result, entity) {
  removeCard();
  clearTimeout(hideTimer);
  const model = L.buildCardModel(result);
  const question = entity ? L.questionForEntity(result, entity.original) : model.questions[0];

  const card = document.createElement("div");
  card.className = "rpcs1-card";
  card.innerHTML = `
    <div class="rpcs1-card-title">${esc(titleText)}</div>
    <div class="rpcs1-card-subline">${esc(model.subline)}</div>
    ${
      model.readings.length > 1
        ? `<ul class="rpcs1-card-readings">${model.readings
            .map((r) => `<li>${esc(r)}</li>`)
            .join("")}</ul>`
        : ""
    }
    ${
      model.readsAs
        ? `<div class="rpcs1-card-readsas">Reads as: <em>${esc(model.readsAs)}</em></div>`
        : ""
    }
    ${
      question
        ? `<div class="rpcs1-card-question">A reader's first question: ${esc(question)}</div>`
        : ""
    }
    <div class="rpcs1-card-engine">${esc(model.engine)} · ${esc(model.arLevel)}</div>
  `;
  card.style.pointerEvents = "auto";
  card.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  card.addEventListener("mouseleave", scheduleHideCard);
  getOverlayRoot().appendChild(card);
  card.style.top = `${window.scrollY + anchorRect.bottom + 6}px`;
  card.style.left = `${Math.max(4, window.scrollX + anchorRect.left)}px`;
  activeCard = card;
}

// ── contenteditable rendering (overlay strips from live Ranges) ─────────────

function findWordRange(el, word) {
  // First whole-word, case-insensitive occurrence inside a single text node.
  // (A phrase split across formatting nodes is missed in v0 — noted in README.)
  const re = L.surfaceRegex(word);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const m = re.exec(node.textContent);
    if (m) {
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      return range;
    }
  }
  return null;
}

function renderSpanUnderlines(el, fork) {
  clearOverlays(el);
  const st = stateFor(el);
  st.muted = st.muted || new Set();
  const spans = (fork.spans || []).filter(
    (sp) => sp && sp.text && !st.muted.has(sp.text.toLowerCase())
  );
  if (!spans.length) return;
  if (el.isContentEditable) {
    for (const sp of spans) {
      const range = findWordRange(el, sp.text);
      if (range) st.marks.push({ range, span: sp });
    }
    if (st.marks.length) {
      activeFields.add(el);
      drawStrips(el);
      return;
    }
  }
  // <textarea>/<input> (no DOM text nodes to Range against): corner badge.
  renderBadge(el, { spans });
}

// ── Three-exit picker (v0.5) ────────────────────────────────────────────────
// Every choose-your-meaning surface carries an escape hatch: our enumeration
// might not contain what they meant (measured branch coverage: 2/9 on real
// misreads). Exits: try-again (rejected list, capped), the gloss box (always
// present), and leave-as-is (mute; the sender's call is final).

const MAX_REROLLS = 2;
let pickerState = null;
let activePicker = null;

function removePicker() {
  if (activePicker) {
    activePicker.remove();
    activePicker = null;
  }
  pickerState = null;
}

function logFlywheel(entry) {
  // Local-only coverage-failure log (last 200 events). Every reject and
  // gloss is a labeled example of where reading-generation missed — the
  // data that improves branch coverage. Never leaves the machine in v0.
  try {
    chrome.storage.local.get({ rpcs1_flywheel: [] }, (d) => {
      const arr = d.rpcs1_flywheel || [];
      arr.push({ t: Date.now(), ...entry });
      chrome.storage.local.set({ rpcs1_flywheel: arr.slice(-200) });
    });
  } catch (e) { /* storage unavailable — flywheel is best-effort */ }
}

// Append the clarifier through the editor's own input pipeline so managed
// editors keep their internal model consistent. Append-only, at the end —
// never splits the user's text mid-node. Falls back to clipboard.
function applyClarifier(el, clarifier) {
  const text = "\n\n" + clarifier;
  try {
    el.focus();
    if (el.isContentEditable) {
      const sel = window.getSelection();
      sel.selectAllChildren(el);
      sel.collapseToEnd();
      if (document.execCommand("insertText", false, text)) return "inserted";
    } else {
      const end = (el.value || "").length;
      el.setSelectionRange(end, end);
      if (document.execCommand("insertText", false, text)) return "inserted";
      el.value += text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return "inserted";
    }
  } catch (e) { /* fall through to clipboard */ }
  try { navigator.clipboard.writeText(clarifier); } catch (e) { /* ignore */ }
  return "copied";
}

function openPicker(el, span) {
  const draft = readFieldText(el);
  pickerState = {
    el,
    span,
    rejected: [],
    rerolls: 0,
    draft: draft.length > MAX_LEN ? draft.slice(-MAX_LEN) : draft
  };
  loadPicker();
}

async function loadPicker() {
  if (!pickerState) return;
  renderPickerCard({ loading: true });
  const res = await sendBg({
    type: "RPCS1_FORK",
    payload: {
      text: pickerState.draft,
      risk: riskForThisPage(),
      floor: false,
      rejected: pickerState.rejected
    }
  });
  if (!pickerState) return; // dismissed while loading
  const model = res.ok
    ? L.buildPickerModel(res.data)
    : { branches: [], engine: "?", status: "error" };
  renderPickerCard({ model });
}

function pickerAnchorRect() {
  const st = pickerState && fieldState.get(pickerState.el);
  const mark = st && st.marks.find((m) => m.span === pickerState.span);
  if (mark) {
    try {
      const r = mark.range.getBoundingClientRect();
      if (r && (r.width || r.height)) return r;
    } catch (e) { /* range invalidated */ }
  }
  if (pickerState && pickerState.el.isConnected) {
    return pickerState.el.getBoundingClientRect();
  }
  return { left: 40, bottom: 80 };
}

function renderPickerCard(state) {
  if (activePicker) activePicker.remove();
  const { el, span } = pickerState;
  const card = document.createElement("div");
  card.className = "rpcs1-card rpcs1-fork-card rpcs1-picker";
  card.style.pointerEvents = "auto";

  const title = document.createElement("div");
  title.className = "rpcs1-card-title";
  title.textContent = span
    ? `"${span.text}" can be taken more than one way.`
    : "This can be taken more than one way.";
  card.appendChild(title);

  const close = document.createElement("button");
  close.className = "rpcs1-close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", removePicker);
  card.appendChild(close);

  const sub = document.createElement("div");
  sub.className = "rpcs1-card-subline";
  // Copy law: "closest to" — the list never claims to be complete.
  sub.textContent = state.loading
    ? "Reading it both ways…"
    : "Which is closest to what you meant?";
  card.appendChild(sub);

  if (!state.loading) {
    const branches = (state.model.branches || []).filter((b) => b.clarifier);
    for (const b of branches) {
      const btn = document.createElement("button");
      btn.className = "rpcs1-btn rpcs1-branch-btn";
      btn.type = "button";
      btn.textContent = b.summary;
      btn.title = b.clarifier;
      btn.addEventListener("click", () => {
        const how = applyClarifier(el, b.clarifier);
        logFlywheel({ kind: "accept", span: span && span.text, branch: b.summary });
        if (how === "copied") {
          btn.textContent = "Copied — paste it at the end";
          setTimeout(removePicker, 1600);
        } else {
          removePicker();
        }
      });
      card.appendChild(btn);
    }
    if (!branches.length) {
      const none = document.createElement("div");
      none.className = "rpcs1-card-subline";
      none.textContent =
        state.model.status === "error"
          ? "Couldn't fetch readings — your own words below still work."
          : "No new readings — say it in your own words below.";
      card.appendChild(none);
    }

    const exits = document.createElement("div");
    exits.className = "rpcs1-actions rpcs1-exits";

    if (pickerState.rerolls < MAX_REROLLS && branches.length) {
      const again = document.createElement("button");
      again.className = "rpcs1-btn rpcs1-btn-quiet";
      again.type = "button";
      again.textContent = "None of these — try again";
      again.addEventListener("click", () => {
        pickerState.rejected = L.mergeRejected(pickerState.rejected, state.model.branches);
        pickerState.rerolls++;
        logFlywheel({
          kind: "reject",
          span: span && span.text,
          shown: state.model.branches.map((b) => b.summary)
        });
        loadPicker();
      });
      exits.appendChild(again);
    }

    const fine = document.createElement("button");
    fine.className = "rpcs1-btn rpcs1-btn-quiet";
    fine.type = "button";
    fine.textContent = "It's fine as I wrote it";
    fine.addEventListener("click", () => {
      const stf = stateFor(el);
      stf.muted = stf.muted || new Set();
      if (span && span.text) stf.muted.add(span.text.toLowerCase());
      logFlywheel({ kind: "dismiss", span: span && span.text });
      clearOverlays(el);
      removePicker();
    });
    exits.appendChild(fine);
    card.appendChild(exits);

    // The gloss box — the exit that always exists. The user's words are
    // ground truth; the tool only frames them onto the end of the message.
    const glossRow = document.createElement("div");
    glossRow.className = "rpcs1-gloss-row";
    const input = document.createElement("input");
    input.className = "rpcs1-gloss-input";
    input.type = "text";
    input.placeholder = "Or say it in a few words…";
    input.maxLength = 140;
    const add = document.createElement("button");
    add.className = "rpcs1-btn";
    add.type = "button";
    add.textContent = "Add";
    add.addEventListener("click", () => {
      const clarifier = L.composeGlossClarifier(input.value);
      if (!clarifier) return;
      const how = applyClarifier(el, clarifier);
      logFlywheel({ kind: "gloss", span: span && span.text, gloss: input.value.trim() });
      if (how === "copied") {
        add.textContent = "Copied";
        setTimeout(removePicker, 1600);
      } else {
        removePicker();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add.click();
      e.stopPropagation();
    });
    glossRow.appendChild(input);
    glossRow.appendChild(add);
    card.appendChild(glossRow);

    const tag = document.createElement("div");
    tag.className = "rpcs1-card-engine";
    tag.textContent = state.model.engine || "?";
    card.appendChild(tag);
  }

  getOverlayRoot().appendChild(card);
  const rect = pickerAnchorRect();
  card.style.top = `${window.scrollY + rect.bottom + 8}px`;
  card.style.left = `${Math.max(4, window.scrollX + rect.left)}px`;
  activePicker = card;
}

function drawStrips(el) {
  const st = fieldState.get(el);
  if (!st) return;
  st.nodes.forEach((n) => n.remove());
  st.nodes = [];
  if (!el.isConnected) {
    clearOverlays(el);
    return;
  }
  const root = getOverlayRoot();
  for (const mark of st.marks) {
    let rects;
    try {
      rects = mark.range.getClientRects();
    } catch {
      continue; // range invalidated by an edit; next check rebuilds
    }
    for (const rect of rects) {
      if (!rect.width) continue;
      const strip = document.createElement("div");
      strip.className = "rpcs1-strip";
      strip.style.left = `${window.scrollX + rect.left}px`;
      strip.style.top = `${window.scrollY + rect.bottom - 5}px`;
      strip.style.width = `${rect.width}px`;
      strip.title = `"${mark.span.text}" — can be taken more than one way. Click to fix.`;
      strip.addEventListener("click", () => openPicker(el, mark.span));
      root.appendChild(strip);
      st.nodes.push(strip);
    }
  }
}

// ── textarea/<input> + whole-message rendering (corner badge) ───────────────

function renderBadge(el, fork) {
  clearOverlays(el);
  const st = stateFor(el);
  if (!el.isConnected) return;
  const rect = el.getBoundingClientRect();
  const badge = document.createElement("div");
  badge.className = "rpcs1-badge";
  badge.style.left = `${window.scrollX + rect.right - 18}px`;
  badge.style.top = `${window.scrollY + rect.top + 5}px`;
  const spans = fork.spans || [];
  badge.title = spans.map((sp) => `"${sp.text}"`).join(", ") + " — can be taken more than one way";
  badge.addEventListener("click", () => openPicker(el, spans[0] || null));
  getOverlayRoot().appendChild(badge);
  st.nodes.push(badge);
  activeFields.add(el);
}

// ── Reposition on scroll/resize (overlays track the text) ───────────────────

let repositionQueued = false;
function queueReposition() {
  if (repositionQueued) return;
  repositionQueued = true;
  requestAnimationFrame(() => {
    repositionQueued = false;
    for (const el of activeFields) {
      if (!el.isConnected) {
        clearOverlays(el);
        continue;
      }
      const st = fieldState.get(el);
      if (st && st.marks.length) drawStrips(el);
      // Badges are cheap: leave until next check rather than tracking rects.
    }
  });
}
window.addEventListener("scroll", queueReposition, { capture: true, passive: true });
window.addEventListener("resize", queueReposition, { passive: true });

// ── Field wiring ────────────────────────────────────────────────────────────

function readFieldText(el) {
  return el.isContentEditable ? el.innerText : el.value || "";
}

function handleField(el) {
  if (!el || bound.has(el)) return;
  const isEditable =
    el.isContentEditable ||
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && /^(text|search)$/i.test(el.type || "text"));
  if (!isEditable) return;
  bound.add(el);

  const check = debounce(async () => {
    let text = readFieldText(el);
    const st = stateFor(el);
    if (text === st.lastText) return;
    st.lastText = text;

    if (!text || text.trim().length < MIN_LEN) {
      clearOverlays(el);
      return;
    }
    if (text.length > MAX_LEN) text = text.slice(-MAX_LEN);

    // v0.5 passive mode: deterministic mirror floor (floor:true — the server
    // makes NO model call; free and precise-by-contract). CAL-1/2 killed
    // entity-gate flagging on both engines; mirror spans are the calibrated
    // passive signal. The model joins only when the user opens the picker.
    const result = await sendBg({ type: "RPCS1_FORK", payload: { text, risk: riskForThisPage(), floor: true } });
    if (!result.ok) return;

    // Stale-guard: the draft may have changed while the call was in flight.
    if (readFieldText(el) !== st.lastText) return;

    if (!L.shouldUnderline(result.data)) {
      clearOverlays(el);
      removeCard();
      return;
    }
    renderSpanUnderlines(el, result.data);
  }, DEBOUNCE_MS);

  el.addEventListener("input", () => {
    clearOverlays(el); // stale the moment the text changes
    removeCard();
    check();
  });
  el.addEventListener("blur", scheduleHideCard);
}

function scanForFields(root = document) {
  if (!root.querySelectorAll) return;
  root
    .querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"]')
    .forEach(handleField);
}

// ── Receiver-side fork card ("How could this read?" on a selection) ─────────

let activeForkCard = null;
let forkDismissBound = false;

function removeForkCard() {
  if (activeForkCard) {
    activeForkCard.remove();
    activeForkCard = null;
  }
}

function selectionAnchorRect() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return rect;
  }
  // Selection already gone (some pages clear it on menu open): fixed fallback.
  return { left: Math.max(8, window.innerWidth / 2 - 190), bottom: 72, top: 72 };
}

const FORK_TITLES = {
  forks: "This reads more than one way.",
  referent: "One reading — but a pointer is unresolved.",
  clean: "Parses one way.",
  budget: "Out of deep checks today.",
  error: "Couldn't check this."
};

function copyButton(label, text) {
  const btn = document.createElement("button");
  btn.className = "rpcs1-btn";
  btn.type = "button";
  btn.textContent = label;
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(
      () => {
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = label), 1400);
      },
      () => {
        btn.textContent = "Copy failed";
      }
    );
  });
  return btn;
}

function renderForkCard(model, selection) {
  removeForkCard();
  removeCard(); // never stack on a sender-side hover card
  const rect = selectionAnchorRect();

  const card = document.createElement("div");
  card.className = "rpcs1-card rpcs1-fork-card";
  card.style.pointerEvents = "auto";

  const title = document.createElement("div");
  title.className = "rpcs1-card-title";
  title.textContent = FORK_TITLES[model.status] || FORK_TITLES.error;
  card.appendChild(title);

  const close = document.createElement("button");
  close.className = "rpcs1-close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", removeForkCard);
  card.appendChild(close);

  if (model.status === "forks") {
    const list = document.createElement("ol");
    list.className = "rpcs1-branches";
    for (const b of model.branches) {
      const li = document.createElement("li");
      li.className = "rpcs1-branch";
      const sum = document.createElement("div");
      sum.textContent = b.summary;
      li.appendChild(sum);
      if (b.consequence) {
        const cons = document.createElement("div");
        cons.className = "rpcs1-branch-consequence";
        cons.textContent = b.consequence;
        li.appendChild(cons);
      }
      list.appendChild(li);
    }
    card.appendChild(list);
  } else if (model.status === "referent") {
    const p = document.createElement("div");
    p.className = "rpcs1-card-subline";
    p.textContent = model.unresolved && model.unresolved.length
      ? `"${model.unresolved.join('", "')}" — you can't recover what this points to from the words alone.`
      : "A referent in this message isn't recoverable from the words alone.";
    card.appendChild(p);
  } else if (model.status === "clean") {
    const p = document.createElement("div");
    p.className = "rpcs1-card-subline";
    p.textContent = model.canonical
      ? `Best reading: ${model.canonical}`
      : "No fork detected. Read it as written.";
    card.appendChild(p);
  } else if (model.status === "budget") {
    const p = document.createElement("div");
    p.className = "rpcs1-card-subline";
    p.textContent =
      "The deep check is rate-limited for today. The fallback engine can't produce a trustworthy fork, so nothing is shown rather than noise.";
    card.appendChild(p);
  } else {
    const p = document.createElement("div");
    p.className = "rpcs1-card-subline";
    p.textContent = model.error || "No response from the checker.";
    card.appendChild(p);
  }

  // Reply builders — the card's teeth.
  const actions = document.createElement("div");
  actions.className = "rpcs1-actions";
  const ask = model.branch_question || (model.ask_backs && model.ask_backs[0]) || null;
  if (ask) actions.appendChild(copyButton("Copy ask-back", ask));
  if (model.forked_answer_scaffold) {
    actions.appendChild(copyButton("Copy forked answer", model.forked_answer_scaffold));
  }
  if (actions.childNodes.length) card.appendChild(actions);

  const tag = document.createElement("div");
  tag.className = "rpcs1-card-engine";
  tag.textContent = `${model.engine || "?"}${model.ar_level ? " · " + model.ar_level : ""}`;
  card.appendChild(tag);

  getOverlayRoot().appendChild(card);
  card.style.top = `${window.scrollY + rect.bottom + 8}px`;
  card.style.left = `${Math.max(4, window.scrollX + rect.left)}px`;
  activeForkCard = card;

  if (!forkDismissBound) {
    forkDismissBound = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { removeForkCard(); removePicker(); }
    });
    document.addEventListener("mousedown", (e) => {
      if (activeForkCard && !activeForkCard.contains(e.target)) removeForkCard();
      if (activePicker && !activePicker.contains(e.target) && !(e.target.closest && e.target.closest(".rpcs1-strip"))) removePicker();
    });
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "RPCS1_FORK_RESULT") return;
  renderForkCard(L.normalizeForkPayload(msg.payload), msg.selection || "");
});

// Initial pass + dynamically added fields (SPAs swap DOM constantly).
scanForFields();
document.addEventListener("focusin", (e) => handleField(e.target), true);
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    m.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.hasAttribute && node.hasAttribute("data-rpcs1-overlay")) return;
      scanForFields(node);
    });
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
