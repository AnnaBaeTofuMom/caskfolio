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

  it('marks feed owner and follow state for each item', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u-me', email: 'me@caskfolio.com', username: 'me', name: 'Me' })
      },
      follow: {
        findMany: vi.fn().mockResolvedValue([{ followingId: 'u-following' }])
      },
      whiskyAsset: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'a1',
              owner: { id: 'u-following', username: 'friend', name: 'Friend', profileImage: null },
              photoUrl: 'https://img/1.jpg',
              caption: 'hello',
              customProductName: 'Bottle A',
              variant: null,
              createdAt: new Date('2026-02-14T00:00:00.000Z')
            }
          ])
          .mockResolvedValueOnce([
            {
              id: 'a2',
              owner: { id: 'u-stranger', username: 'newbie', name: 'Newbie', profileImage: null },
              photoUrl: null,
              caption: null,
              customProductName: 'Bottle B',
              variant: null,
              createdAt: new Date('2026-02-14T01:00:00.000Z')
            }
          ])
      }
    };

    const feedService = {
      mix: vi.fn().mockReturnValue({
        items: [
          { id: 'a1', source: 'FOLLOWING' },
          { id: 'a2', source: 'RECOMMENDED' }
        ]
      })
    } as never;

    const service = new SocialService(prisma, feedService);
    const result = await service.feed('me@caskfolio.com');

    expect(result.items[0]!.owner.id).toBe('u-following');
    expect(result.items[0]!.isFollowing).toBe(true);
    expect(result.items[1]!.owner.id).toBe('u-stranger');
    expect(result.items[1]!.isFollowing).toBe(false);
    expect(result.items[0]!.isOwnAsset).toBe(false);
  });
});
