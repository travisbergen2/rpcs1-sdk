/**
 * Hand-off — open the user's own model app with the prompt pre-filled.
 *
 * SendRight's primary send path: rpcs1 never makes the API call. The prompt is
 * handed to the vendor's own app via a deep-link URL parameter where supported,
 * or via clipboard fallback where not. The user reviews and hits send in their
 * own app; rpcs1 never sees the answer.
 *
 * Design rules:
 *   - The capability table is DATA, verified per-vendor with a date stamp.
 *     Prefill parameters are undocumented vendor behavior and churn without
 *     notice — re-verify entries at every release; any entry can be hot-fixed
 *     to method:'clipboard' without touching logic.
 *   - Every vendor degrades gracefully to clipboard. buildHandoff never throws
 *     for a known vendor.
 *   - Pure module: URL construction only, no navigation and no clipboard I/O —
 *     the caller (web UI) owns the side effects.
 *
 * Known caveat (keep in user-facing docs): logged-out users are typically
 * bounced to a login page and the prefill may be lost.
 */

export type VendorId = 'chatgpt' | 'claude' | 'perplexity' | 'grok' | 'gemini' | 'copilot';

export type HandoffMethod = 'url_prefill' | 'clipboard';

export interface VendorCapability {
  id: VendorId;
  /** Display name */
  label: string;
  /** Home URL — opened in clipboard mode */
  homeUrl: string;
  /** Preferred hand-off method as of `verified` */
  method: HandoffMethod;
  /** URL template; `{q}` is replaced with the encoded prompt. null when method is clipboard. */
  prefillTemplate: string | null;
  /** ISO date the entry was last verified against the live vendor app */
  verified: string;
  /** Honest notes: source of verification, known caveats */
  notes: string;
}

/**
 * Verified 2026-07-25 (source: live vendor behavior surveyed via linkmyprompt.com,
 * Nov 2025, cross-checked at spec time). Gemini and Copilot previously supported
 * prefill parameters; support was restricted/removed — clipboard only.
 */
export const VENDOR_CAPABILITIES: Record<VendorId, VendorCapability> = {
  chatgpt: {
    id: 'chatgpt', label: 'ChatGPT', homeUrl: 'https://chatgpt.com/',
    method: 'url_prefill', prefillTemplate: 'https://chatgpt.com/?q={q}',
    verified: '2026-07-25', notes: 'Undocumented parameter; prefills composer. Logged-out users may lose the prefill at login.',
  },
  claude: {
    id: 'claude', label: 'Claude', homeUrl: 'https://claude.ai/new',
    method: 'url_prefill', prefillTemplate: 'https://claude.ai/new?q={q}',
    verified: '2026-07-25', notes: 'Undocumented parameter; prefills composer on /new. Logged-out users may lose the prefill at login.',
  },
  perplexity: {
    id: 'perplexity', label: 'Perplexity', homeUrl: 'https://www.perplexity.ai/',
    method: 'url_prefill', prefillTemplate: 'https://www.perplexity.ai/search?q={q}',
    verified: '2026-07-25', notes: 'Search-style parameter; may auto-run the query rather than waiting for user send.',
  },
  grok: {
    id: 'grok', label: 'Grok', homeUrl: 'https://grok.com/',
    method: 'url_prefill', prefillTemplate: 'https://grok.com/?q={q}',
    verified: '2026-07-25', notes: 'Undocumented parameter; prefills composer.',
  },
  gemini: {
    id: 'gemini', label: 'Gemini', homeUrl: 'https://gemini.google.com/app',
    method: 'clipboard', prefillTemplate: null,
    verified: '2026-07-25', notes: 'Prefill parameter previously reported, now restricted/removed — clipboard fallback only.',
  },
  copilot: {
    id: 'copilot', label: 'Copilot', homeUrl: 'https://copilot.microsoft.com/',
    method: 'clipboard', prefillTemplate: null,
    verified: '2026-07-25', notes: 'Prefill parameter previously reported, now unreliable — clipboard fallback only.',
  },
};

export interface HandoffPlan {
  vendor: VendorId;
  method: HandoffMethod;
  /** URL to open (prefilled when method is url_prefill, vendor home when clipboard) */
  url: string;
  /** Exact text the caller must place on the clipboard (clipboard mode only) */
  clipboardText: string | null;
  /** One-line instruction the UI shows the user */
  instructions: string;
}

/**
 * Build a hand-off plan for a vendor. Pure: performs no navigation or
 * clipboard writes. Throws only on unknown vendor ids.
 */
export function buildHandoff(vendor: VendorId, prompt: string): HandoffPlan {
  const cap = VENDOR_CAPABILITIES[vendor];
  if (!cap) throw new Error(`Unknown vendor: ${vendor}`);

  if (cap.method === 'url_prefill' && cap.prefillTemplate) {
    return {
      vendor,
      method: 'url_prefill',
      url: cap.prefillTemplate.replace('{q}', encodeURIComponent(prompt)),
      clipboardText: null,
      instructions: `Opens ${cap.label} with your prompt filled in — review it there and hit send.`,
    };
  }
  return {
    vendor,
    method: 'clipboard',
    url: cap.homeUrl,
    clipboardText: prompt,
    instructions: `Your prompt is copied — ${cap.label} opens next, just paste and send.`,
  };
}

/** Vendors in default display order (prefill-capable first). */
export function listVendors(): VendorCapability[] {
  const order: VendorId[] = ['chatgpt', 'claude', 'perplexity', 'grok', 'gemini', 'copilot'];
  return order.map((id) => VENDOR_CAPABILITIES[id]);
}
