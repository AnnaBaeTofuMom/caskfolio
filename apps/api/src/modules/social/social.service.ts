import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SocialFeedService } from './social-feed.service.js';

interface FeedItem {
  id: string;
  source?: 'FOLLOWING' | 'RECOMMENDED';
}

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialFeedService: SocialFeedService
  ) {}

  async follow(userEmail: string, userId: string) {
    const me = await this.ensureUser(userEmail);

    if (me.id === userId) {
      return { followed: false, userId, reason: 'cannot follow self' };
    }

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: me.id, followingId: userId } },
      create: { followerId: me.id, followingId: userId },
      update: {}
    });

    return { followed: true, userId };
  }

  async unfollow(userEmail: string, userId: string) {
    const me = await this.ensureUser(userEmail);

    await this.prisma.follow.deleteMany({
      where: { followerId: me.id, followingId: userId }
    });

    return { followed: false, userId };
  }

  async feed(userEmail: string, cursor?: string, limit = 10) {
    const me = await this.ensureUser(userEmail);
    const following = await this.prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followingId: true }
    });
    const followingIds = following.map((f: { followingId: string }) => f.followingId);

    const [followingAssets, recommendedAssets] = await Promise.all([
      followingIds.length
        ? this.prisma.whiskyAsset.findMany({
            where: {
              visibility: 'PUBLIC',
              userId: { in: followingIds },
              ...(cursor ? { id: { lt: cursor } } : {})
            },
            include: {
              owner: true,
              variant: { include: { product: { include: { brand: true } }, priceAggregate: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit * 2
          })
        : Promise.resolve([]),
      this.prisma.whiskyAsset.findMany({
        where: {
          visibility: 'PUBLIC',
          userId: { not: me.id, notIn: followingIds },
          ...(cursor ? { id: { lt: cursor } } : {})
        },
        include: {
          owner: true,
          variant: { include: { product: { include: { brand: true } }, priceAggregate: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2
      })
    ]);

    const mixed = this.socialFeedService.mix<FeedItem>(
      followingAssets.map((a: { id: string }) => ({ id: a.id })),
      recommendedAssets.map((a: { id: string }) => ({ id: a.id })),
      limit
    );

    const followingMap = new Map(followingAssets.map((a: { id: string }) => [a.id, a]));
    const recommendedMap = new Map(recommendedAssets.map((a: { id: string }) => [a.id, a]));

    const items = mixed.items
      .map((entry) => {
        const raw: any = entry.source === 'FOLLOWING' ? followingMap.get(entry.id) : recommendedMap.get(entry.id);
        if (!raw) return null;

        const displayName =
          raw.customProductName ??
          [raw.variant?.product.brand.name, raw.variant?.product.name, raw.variant?.specialTag].filter(Boolean).join(' ');

        return {
          assetId: raw.id,
          owner: {
            id: raw.owner.id,
            username: raw.owner.username,
            name: raw.owner.name,
            profileImage: raw.owner.profileImage ?? undefined
          },
          imageUrl: raw.photoUrl ?? undefined,
          title: displayName || 'Unknown Whisky',
          caption: raw.caption ?? undefined,
          trustedPrice: raw.variant?.priceAggregate?.trustedPrice ? Number(raw.variant.priceAggregate.trustedPrice) : null,
          priceMethod: raw.variant?.priceAggregate?.method ?? 'HIDDEN',
          confidence: raw.variant?.priceAggregate?.confidence ?? 0,
          isFollowing: followingIds.includes(raw.owner.id),
          isOwnAsset: raw.owner.id === me.id,
          source: entry.source,
          createdAt: raw.createdAt.toISOString()
        };
      })
      .filter(Boolean);

    return {
      cursor,
      mix: { following: 0.7, recommended: 0.3 },
      nextCursor: items.length ? items[items.length - 1]!.assetId : null,
      items
    };
  }

  async publicProfile(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) {
      return {
        username,
        summary: { assetCount: 0, publicAssets: 0 },
        assets: []
      };
    }

    const assets = await this.prisma.whiskyAsset.findMany({
      where: { userId: user.id, visibility: 'PUBLIC' },
      include: {
        variant: {
          include: { product: { include: { brand: true } }, priceAggregate: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      username: user.username,
      summary: { assetCount: assets.length, publicAssets: assets.length },
      assets: assets.map((asset: (typeof assets)[number]) => ({
        assetId: asset.id,
        title:
          asset.customProductName ??
          [asset.variant?.product.brand.name, asset.variant?.product.name, asset.variant?.specialTag].filter(Boolean).join(' '),
        imageUrl: asset.photoUrl,
        caption: asset.caption ?? undefined,
        visibility: asset.visibility,
        trustedPrice: asset.variant?.priceAggregate?.trustedPrice ? Number(asset.variant.priceAggregate.trustedPrice) : null
      }))
    };
  }

  private async ensureUser(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return existing;

    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    const username = `${usernameBase}${Date.now().toString().slice(-6)}`;

    return this.prisma.user.create({
      data: {
        email,
        username,
        name: usernameBase || 'User'
      }
    });
  }
}
