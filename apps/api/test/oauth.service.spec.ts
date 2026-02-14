import { describe, expect, it, vi } from 'vitest';
import { OauthService } from '../src/modules/auth/oauth.service.js';

describe('OauthService', () => {
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
