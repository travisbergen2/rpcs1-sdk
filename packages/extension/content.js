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

function callInterpret(text, risk) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "RPCS1_INTERPRET", payload: { text, risk } },
      (response) => resolve(response || { ok: false, error: "no response" })
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

function renderInline(el, result) {
  clearOverlays(el);
  const st = stateFor(el);
  for (const ent of L.unresolvedEntities(result)) {
    const range = findWordRange(el, ent.original);
    if (range) st.marks.push({ range, ent, result });
  }
  if (st.marks.length === 0) {
    // Whole-message fork with no specific span to underline -> corner badge.
    if (L.messageForks(result)) renderBadge(el, result);
    return;
  }
  activeFields.add(el);
  drawStrips(el);
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
      strip.addEventListener("mouseenter", () =>
        showCard(rect, `"${mark.ent.original}"`, mark.result, mark.ent)
      );
      strip.addEventListener("mouseleave", scheduleHideCard);
      root.appendChild(strip);
      st.nodes.push(strip);
    }
  }
}

// ── textarea/<input> + whole-message rendering (corner badge) ───────────────

function renderBadge(el, result) {
  clearOverlays(el);
  const st = stateFor(el);
  if (!el.isConnected) return;
  const rect = el.getBoundingClientRect();
  const badge = document.createElement("div");
  badge.className = "rpcs1-badge";
  badge.style.left = `${window.scrollX + rect.right - 18}px`;
  badge.style.top = `${window.scrollY + rect.top + 5}px`;
  const flagged = L.unresolvedEntities(result).map((e) => `"${e.original}"`);
  const title = flagged.length
    ? flagged.join(", ")
    : "This message";
  badge.addEventListener("mouseenter", () => showCard(rect, title, result, null));
  badge.addEventListener("mouseleave", scheduleHideCard);
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

    const result = await callInterpret(text, riskForThisPage());
    if (!result.ok) return;

    // Stale-guard: the draft may have changed while the call was in flight.
    if (readFieldText(el) !== st.lastText) return;

    // shouldRender = shouldFlag + engine gate: rules-path fallback results
    // never drive UI (calibrated 47/47 flag rate incl. all controls — see
    // logic.js). Only model-path results are selective enough to render.
    if (!L.shouldRender(result.data)) {
      clearOverlays(el);
      removeCard();
      return;
    }
    if (el.isContentEditable) {
      renderInline(el, result.data);
    } else {
      renderBadge(el, result.data);
    }
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
      if (e.key === "Escape") removeForkCard();
    });
    document.addEventListener("mousedown", (e) => {
      if (activeForkCard && !activeForkCard.contains(e.target)) removeForkCard();
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
