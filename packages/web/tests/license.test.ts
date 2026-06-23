import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { generateLicenseKey, verifyLicenseKey } from '../lib/license';

const secret = new TextEncoder().encode('dev-secret-change-in-prod');

describe('license keys', () => {
  it('validates keys carrying a billing-period expiration', async () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 3600;

    const token = await generateLicenseKey({
      email: 'buyer@example.com',
      tier: 'indie',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      issuedAt,
      expiresAt,
    });

    await expect(verifyLicenseKey(token)).resolves.toMatchObject({
      email: 'buyer@example.com',
      tier: 'indie',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      issuedAt,
      expiresAt,
    });
  });

  it('rejects expired keys', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 7200;
    const token = await generateLicenseKey({
      email: 'buyer@example.com',
      tier: 'team',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      issuedAt,
      expiresAt: issuedAt + 60,
    });

    await expect(verifyLicenseKey(token)).resolves.toBeNull();
  });

  it('rejects legacy keys without exp', async () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const legacyToken = await new SignJWT({
      email: 'legacy@example.com',
      tier: 'indie',
      cid: 'cus_legacy',
      sid: 'sub_legacy',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(issuedAt)
      .setIssuer('rpcs1.dev')
      .setSubject('legacy@example.com')
      .sign(secret);

    await expect(verifyLicenseKey(legacyToken)).resolves.toBeNull();
  });
});
