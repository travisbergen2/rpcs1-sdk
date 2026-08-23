/**
 * Feature flags — deliberately boring on purpose.
 *
 * DONATIONS_LIVE gates the entire support/donation rail (see
 * components/SupportLink.tsx). It stays FALSE until two out-of-band gates
 * clear, in this order (internal spec §7, 2026-08-23):
 *   1. The SSA decision letter arrives (which program governs the rules), and
 *   2. one WIPA benefits-counseling session maps how support money may flow.
 * Flipping this to true is a deliberate act after those gates — never part of
 * an unrelated deploy.
 */
export const DONATIONS_LIVE = false;

/** Set when the rail goes live (Stripe payment link). Empty while dormant. */
export const SUPPORT_URL = '';
