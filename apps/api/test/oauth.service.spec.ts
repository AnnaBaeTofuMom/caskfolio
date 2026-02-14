import { describe, expect, it, vi } from 'vitest';
import { OauthService } from '../src/modules/auth/oauth.service.js';

describe('OauthService', () => {
  it('builds google and apple auth urls', () => {
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.APPLE_CLIENT_ID = 'apple-client-id';
    const service = new OauthService();

    const googleUrl = service.buildGoogleAuthUrl('http://localhost:3000/auth/login');
    const appleUrl = service.buildAppleAuthUrl('http://localhost:3000/auth/login');

    expect(googleUrl).toContain('accounts.google.com');
    expect(googleUrl).toContain('client_id=google-client-id');
    expect(appleUrl).toContain('appleid.apple.com');
    expect(appleUrl).toContain('client_id=apple-client-id');
  });

  it('verifies google token payload via tokeninfo endpoint', async () => {
    const service = new OauthService();

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'google-sub', email: 'g@caskfolio.com', name: 'Google User', exp: String(Math.floor(Date.now() / 1000) + 1000) })
    } as never);

    const profile = await service.verifyGoogleIdToken('token');
    expect(profile.providerSub).toBe('google-sub');

    global.fetch = originalFetch;
  });

  it('verifies apple token payload structure', () => {
    const service = new OauthService();

    const payload = {
      sub: 'apple-sub',
      email: 'a@caskfolio.com',
      aud: process.env.APPLE_CLIENT_ID ?? 'apple-client-id',
      iss: 'https://appleid.apple.com',
      exp: Math.floor(Date.now() / 1000) + 1000
    };

    const token = `a.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.b`;
    const profile = service.verifyAppleIdToken(token);

    expect(profile.providerSub).toBe('apple-sub');
    expect(profile.email).toBe('a@caskfolio.com');
  });
});
