/**
 * Environment variable validation.
 * Throws at startup if required variables are missing.
 */

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // Stripe
  STRIPE_SECRET_KEY:        optionalEnv('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET:    optionalEnv('STRIPE_WEBHOOK_SECRET'),
  STRIPE_INDIE_PRICE_ID:    optionalEnv('STRIPE_INDIE_PRICE_ID'),
  STRIPE_TEAM_PRICE_ID:     optionalEnv('STRIPE_TEAM_PRICE_ID'),

  // License key signing
  LICENSE_JWT_SECRET:       optionalEnv('LICENSE_JWT_SECRET', 'dev-secret-change-in-prod'),

  // Resend (email)
  RESEND_API_KEY:           optionalEnv('RESEND_API_KEY'),
  EMAIL_FROM:               optionalEnv('EMAIL_FROM', 'noreply@rpcs1.dev'),

  // App
  NEXT_PUBLIC_APP_URL:      optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  // Rate limiting (free tier)
  FREE_TIER_HOURLY_LIMIT:   parseInt(optionalEnv('FREE_TIER_HOURLY_LIMIT', '10')),
} as const;
