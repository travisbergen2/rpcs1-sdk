// background.js — owns the network call to rpcs1.dev so content scripts
// never need host permissions on arbitrary pages just to reach the API.
//
// VERIFIED against the real repo + live site (2026-08-15):
//   repo:  travisbergen2/rpcs1-sdk  packages/web/app/api/translate/route.ts
//   live:  POST https://rpcs1.dev/api/translate  -> 200, engine "gateway:openai/gpt-4o-mini"
//
// There is NO /api/interpret route. The translator API multiplexes on `tool`:
//   POST https://rpcs1.dev/api/translate
//   body: { tool: "interpret", text, risk, context?, profile?, answers? }
//   response: TranslationOutput (snake_case) — see logic.js for the fields read.
//
// The manifest's host_permissions on rpcs1.dev lets this service worker fetch
// cross-origin WITHOUT the server needing CORS headers. (A content-script
// fetch would inherit the page origin and be blocked — keep the call here.)

const RPCS1_ENDPOINT = "https://rpcs1.dev/api/translate";

// In-memory cache so retyping the same draft doesn't double-spend a call
// (the server's model path has a per-IP daily budget; cache hits protect it).
// Cleared on service-worker restart.
const cache = new Map();
const MAX_CACHE = 200;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "RPCS1_INTERPRET") return false;

  const { text, risk } = msg.payload;
  const cacheKey = `${risk}::${text}`;

  if (cache.has(cacheKey)) {
    sendResponse({ ok: true, data: cache.get(cacheKey) });
    return false; // synchronous response
  }

  fetch(RPCS1_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: "interpret", text, risk })
  })
    .then((res) => {
      if (!res.ok) throw new Error(`RPCS-1 API ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, data);
      sendResponse({ ok: true, data });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: String(err) });
    });

  return true; // keep the message channel open for the async fetch
});
