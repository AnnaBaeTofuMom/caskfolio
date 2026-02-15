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
    expect(profile.summary.followerCount).toBe(0);
    expect(profile.summary.followingCount).toBe(0);
    expect(profile.assets).toEqual([]);
  });

  it('includes follower/following counts in public profile summary', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          username: 'anna',
          name: 'Anna',
          profileImage: null,
          createdAt: new Date('2026-02-01T00:00:00.000Z')
        })
      },
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([])
      },
      follow: {
        count: vi.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(7)
      }
    };

    const feedService = { mix: vi.fn() } as never;
    const service = new SocialService(prisma, feedService);
    const profile = await service.publicProfile('anna');

    expect(profile.summary.followerCount).toBe(12);
    expect(profile.summary.followingCount).toBe(7);
  });

  it('returns paginated followers list with next cursor', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u-owner', username: 'owner', name: 'Owner' })
      },
      follow: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'f3',
            createdAt: new Date('2026-02-15T10:00:00.000Z'),
            follower: { id: 'u3', username: 'u3', name: 'User3', profileImage: null }
          },
          {
            id: 'f2',
            createdAt: new Date('2026-02-14T10:00:00.000Z'),
            follower: { id: 'u2', username: 'u2', name: 'User2', profileImage: null }
          },
          {
            id: 'f1',
            createdAt: new Date('2026-02-13T10:00:00.000Z'),
            follower: { id: 'u1', username: 'u1', name: 'User1', profileImage: null }
          }
        ])
      }
    };

    const feedService = { mix: vi.fn() } as never;
    const service = new SocialService(prisma, feedService);

    const result = await service.publicFollowers('owner', undefined, 2);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.username).toBe('u3');
    expect(result.nextCursor).toContain('__');
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
          .mockResolvedValue([
            {
              id: 'a1',
              owner: { id: 'u-following', username: 'friend', name: 'Friend', profileImage: null },
              photoUrl: 'https://img/1.jpg',
              caption: 'hello',
              customProductName: 'Bottle A',
              variant: null,
              createdAt: new Date('2026-02-14T00:00:00.000Z')
            },
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

  it('queries feed with post-only filter to separate registered assets', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u-me', email: 'me@caskfolio.com', username: 'me', name: 'Me' })
      },
      follow: {
        findMany: vi.fn().mockResolvedValue([])
      },
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };

    const feedService = { mix: vi.fn().mockReturnValue({ items: [] }) } as never;
    const service = new SocialService(prisma, feedService);

    await service.feed('me@caskfolio.com');

    const query = prisma.whiskyAsset.findMany.mock.calls[0]?.[0];
    expect(query?.where?.visibility).toBe('PUBLIC');
    expect(Array.isArray(query?.where?.OR)).toBe(true);
  });
});
