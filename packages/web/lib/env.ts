function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // Stripe
  STRIPE_SECRET_KEY:        optionalEnv('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET:    optionalEnv('STRIPE_WEBHOOK_SECRET'),
  STRIPE_FOUNDING_PRICE_ID: optionalEnv('STRIPE_FOUNDING_PRICE_ID'),
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

  // MCP production controls
  MCP_HOURLY_LIMIT:         parseInt(optionalEnv('MCP_HOURLY_LIMIT', '120')),
  MCP_MAX_BODY_BYTES:       parseInt(optionalEnv('MCP_MAX_BODY_BYTES', '65536')),
  MCP_ALLOWED_HOSTS:        optionalEnv('MCP_ALLOWED_HOSTS', 'rpcs1.dev,www.rpcs1.dev'),
  MCP_OAUTH_JWT_SECRET:     optionalEnv('MCP_OAUTH_JWT_SECRET', optionalEnv('LICENSE_JWT_SECRET', 'dev-secret-change-in-prod')),
} as const;
