import { describe, expect, it, vi } from 'vitest';
import { SocialService } from '../src/modules/social/social.service.js';

describe('SocialService', () => {
  it('does not follow self', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@a.com', username: 'a', name: 'A' })
      },
      follow: {
        upsert: vi.fn()
      }
    } as never;

    const feedService = { mix: vi.fn() } as never;
    const service = new SocialService(prisma, feedService);

    const result = await service.follow('a@a.com', 'u1');

    expect(result.followed).toBe(false);
    expect(result.reason).toBe('cannot follow self');
  });

  it('returns empty public profile when user not found', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null)
      }
    } as never;

    const feedService = { mix: vi.fn() } as never;
    const service = new SocialService(prisma, feedService);

    const profile = await service.publicProfile('missing');

    expect(profile.summary.assetCount).toBe(0);
    expect(profile.assets).toEqual([]);
  });
});
