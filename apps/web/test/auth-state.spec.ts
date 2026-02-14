import { describe, expect, it, vi } from 'vitest';
import { clearAuthState, hasAccessToken, readAuthContext } from '../lib/auth-state';

function makeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode(header)}.${encode(payload)}.signature`;
}

describe('auth-state helpers', () => {
  it('detects access token correctly', () => {
    expect(hasAccessToken(null)).toBe(false);
    expect(hasAccessToken({ getItem: () => null })).toBe(false);
    expect(hasAccessToken({ getItem: () => 'token' })).toBe(true);
  });

  it('clears auth keys from storage', () => {
    const removeItem = vi.fn();
    clearAuthState({ removeItem });

    expect(removeItem).toHaveBeenCalledWith('caskfolio_access_token');
    expect(removeItem).toHaveBeenCalledWith('caskfolio_refresh_token');
    expect(removeItem).toHaveBeenCalledWith('caskfolio_user_email');
    expect(removeItem).toHaveBeenCalledWith('caskfolio_user_name');
  });

  it('returns null for expired token', () => {
    const expiredToken = makeJwt({
      email: 'expired@caskfolio.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) - 60
    });
    const auth = readAuthContext({
      getItem: () => expiredToken
    });

    expect(auth).toBeNull();
  });

  it('reads email and role for valid token', () => {
    const validToken = makeJwt({
      email: 'admin@caskfolio.com',
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) + 60
    });
    const auth = readAuthContext({
      getItem: () => validToken
    });

    expect(auth?.email).toBe('admin@caskfolio.com');
    expect(auth?.role).toBe('ADMIN');
    expect(auth?.token).toBe(validToken);
  });

  it('falls back to stored email when token has no email claim', () => {
    const tokenWithoutEmail = makeJwt({
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 60
    });
    const auth = readAuthContext({
      getItem: (key: string) => (key === 'caskfolio_access_token' ? tokenWithoutEmail : key === 'caskfolio_user_email' ? 'fallback@caskfolio.com' : null)
    });

    expect(auth?.email).toBe('fallback@caskfolio.com');
    expect(auth?.role).toBe('USER');
  });

  it('returns null when token has no email claim and no stored email', () => {
    const tokenWithoutEmail = makeJwt({
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 60
    });
    const auth = readAuthContext({
      getItem: (key: string) => (key === 'caskfolio_access_token' ? tokenWithoutEmail : null)
    });

    expect(auth).toBeNull();
  });
});
