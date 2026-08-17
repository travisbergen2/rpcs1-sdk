// background.js — owns all network calls to rpcs1.dev so content scripts
// never need host permissions on arbitrary pages just to reach the API.
//
// VERIFIED against the real repo + live site (2026-08-15):
//   repo:  travisbergen2/rpcs1-sdk  packages/web/app/api/translate/route.ts
//   live:  POST https://rpcs1.dev/api/translate  -> 200, engine "gateway:openai/gpt-4o-mini"
//
// There is NO /api/interpret route. The translator API multiplexes on `tool`:
//   POST https://rpcs1.dev/api/translate
//   body: { tool: "interpret" | "fork" | ..., text, risk, context? }
//
// The manifest's host_permissions on rpcs1.dev lets this service worker fetch
// cross-origin WITHOUT the server needing CORS headers. (A content-script
// fetch would inherit the page origin and be blocked — keep the calls here.)

const RPCS1_ENDPOINT = "https://rpcs1.dev/api/translate";

// In-memory cache so repeated text doesn't double-spend a call (the server's
// model path has a per-IP daily budget; cache hits protect it). Cleared on
// service-worker restart.
const cache = new Map();
const MAX_CACHE = 200;

function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

async function callTranslate(body) {
  const res = await fetch(RPCS1_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── Sender-side relay (squiggle mode) ───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "RPCS1_INTERPRET") return false;

  const { text, risk } = msg.payload;
  const cacheKey = `${risk}::${text}`;

  if (cache.has(cacheKey)) {
    sendResponse({ ok: true, data: cache.get(cacheKey) });
    return false; // synchronous response
  }

  callTranslate({ tool: "interpret", text, risk })
    .then(({ status, data }) => {
      if (status !== 200) throw new Error(`RPCS-1 API ${status}`);
      cacheSet(cacheKey, data);
      sendResponse({ ok: true, data });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: String(err) });
    });

  return true; // keep the message channel open for the async fetch
});

// ── v0.5: generic fork relay for the content script ────────────────────────
// floor:true = deterministic mirror floor (server makes NO model call — free,
// cacheable). floor:false = full fork for the picker (model joins; carries
// the user's rejected list so try-again never re-offers refused readings).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "RPCS1_FORK") return false;
  const { text, risk, floor, rejected } = msg.payload;
  const cacheKey = floor ? `floor::${risk}::${text}` : null;
  if (cacheKey && cache.has(cacheKey)) {
    sendResponse({ ok: true, data: cache.get(cacheKey) });
    return false;
  }
  const body = { tool: "fork", text, risk };
  if (floor) body.floor = true;
  if (Array.isArray(rejected) && rejected.length) body.rejected = rejected;
  callTranslate(body)
    .then(({ status, data }) => {
      if (status !== 200 || (data && data.error)) throw new Error(`RPCS-1 API ${status}`);
      if (cacheKey) cacheSet(cacheKey, data);
      sendResponse({ ok: true, data });
    })
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true;
});

// ── Receiver-side: "How could this read?" on any selection ─────────────────
//
// Strictly on-demand (spec §3/§6): one explicit user action = one server
// call. No ambient scanning of incoming messages, ever.
//
// Forward-compatible endpoint strategy: try tool:"fork" (mirror + model
// composition, PR feat/fork-endpoint). Until that deploys, /api/translate
// answers 400 "Unknown tool: fork" and we fall back to tool:"interpret"
// with client-side composition in logic.js. The card renders either.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "rpcs1-fork",
    title: "How could this read?",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "rpcs1-fork" || !tab || !tab.id) return;
  // NOTE: selectionText collapses newlines to spaces (Chrome behavior) —
  // acceptable for v0; noted in README.
  const text = (info.selectionText || "").trim();
  if (!text) return;

  const cacheKey = `fork::${text}`;
  let payload = cache.get(cacheKey);

  if (!payload) {
    try {
      let r = await callTranslate({ tool: "fork", text, risk: "casual" });
      if (r.status === 200 && r.data && !r.data.error) {
        payload = { mode: "fork", data: r.data };
      } else {
        r = await callTranslate({ tool: "interpret", text, risk: "casual" });
        if (r.status !== 200) throw new Error(`RPCS-1 API ${r.status}`);
        payload = { mode: "interpret", data: r.data };
      }
      cacheSet(cacheKey, payload);
    } catch (err) {
      payload = { mode: "error", error: String(err) };
    }
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "RPCS1_FORK_RESULT",
    payload,
    selection: text
  });
});
