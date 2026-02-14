import { describe, expect, it } from 'vitest';
import { hasAccessToken } from '../components/assets/my-assets-panel';

describe('hasAccessToken', () => {
  it('returns false when storage is missing', () => {
    expect(hasAccessToken(null)).toBe(false);
  });

  it('returns false when token is missing', () => {
    const storage = { getItem: () => null };
    expect(hasAccessToken(storage)).toBe(false);
  });

  it('returns true when token exists', () => {
    const storage = { getItem: () => 'token' };
    expect(hasAccessToken(storage)).toBe(true);
  });
});
