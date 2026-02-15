import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async feed(userEmail?: string, cursor?: string, limit = 10) {
    const me = userEmail ? await this.ensureUser(userEmail) : null;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const cursorFilter = this.buildFeedCursorFilter(cursor);
    const following = me
      ? await this.prisma.follow.findMany({
          where: { followerId: me.id },
          select: { followingId: true }
        })
      : [];
    const followingIds = following.map((f: { followingId: string }) => f.followingId);
    const rawAssets = await this.prisma.whiskyAsset.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(cursorFilter ?? {})
      },
      include: {
        owner: true,
        variant: { include: { product: { include: { brand: true } }, priceAggregate: true } },
        ...(me ? { likes: { where: { userId: me.id }, select: { id: true } } } : {}),
        comments: {
          where: { parentCommentId: null },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            user: true,
            replies: {
              orderBy: { createdAt: 'asc' },
              take: 3,
              include: { user: true }
            }
          }
        },
        poll: {
          include: { votes: true }
        },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1
    });

    const hasNextPage = rawAssets.length > safeLimit;
    const pageAssets = hasNextPage ? rawAssets.slice(0, safeLimit) : rawAssets;

    const items = pageAssets
      .map((raw: any) => {
        if (!raw) return null;

        const displayName =
          raw.customProductName ??
          [raw.variant?.product.brand.name, raw.variant?.product.name, raw.variant?.specialTag].filter(Boolean).join(' ');
        const purchasePrice = Number(raw.purchasePrice ?? 0);
        const trustedPrice = raw.variant?.priceAggregate?.trustedPrice ? Number(raw.variant.priceAggregate.trustedPrice) : null;
        const currentValue = trustedPrice ?? purchasePrice;
        const pollVotes = raw.poll?.votes ?? [];
        const pollOptions: string[] = raw.poll?.options ?? [];
        const voteCounts = pollOptions.map((_: string, index: number) => pollVotes.filter((vote: { optionIndex: number }) => vote.optionIndex === index).length);
        const myVote = me ? pollVotes.find((vote: { userId: string }) => vote.userId === me.id) : undefined;
        const recentComments = [...(raw.comments ?? [])].reverse();

        return {
          assetId: raw.id,
          owner: {
            id: raw.owner.id,
            username: raw.owner.username,
            name: raw.owner.name,
            profileImage: raw.owner.profileImage ?? undefined
          },
          imageUrl: raw.photoUrl ?? undefined,
          imageUrls: raw.photoUrls?.length ? raw.photoUrls : raw.photoUrl ? [raw.photoUrl] : undefined,
          title: displayName || 'Unknown Whisky',
          productLine: raw.variant?.product?.name ?? undefined,
          hasBox: Boolean(raw.boxAvailable),
          purchasePrice,
          currentValue,
          caption: raw.caption ?? undefined,
          trustedPrice,
          priceMethod: raw.variant?.priceAggregate?.method ?? 'HIDDEN',
          confidence: raw.variant?.priceAggregate?.confidence ?? 0,
          isFollowing: me ? followingIds.includes(raw.owner.id) : false,
          isOwnAsset: me ? raw.owner.id === me.id : false,
          createdAt: raw.createdAt.toISOString(),
          likeCount: raw._count?.likes ?? 0,
          commentCount: raw._count?.comments ?? 0,
          likedByMe: (raw.likes?.length ?? 0) > 0,
          comments: recentComments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            user: {
              id: comment.user.id,
              username: comment.user.username,
              name: comment.user.name,
              profileImage: comment.user.profileImage ?? undefined
            },
            replies: (comment.replies ?? []).map((reply: any) => ({
              id: reply.id,
              content: reply.content,
              createdAt: reply.createdAt.toISOString(),
              user: {
                id: reply.user.id,
                username: reply.user.username,
                name: reply.user.name,
                profileImage: reply.user.profileImage ?? undefined
              }
            }))
          })),
          poll: raw.poll
            ? {
                question: raw.poll.question,
                options: pollOptions,
                voteCounts,
                totalVotes: pollVotes.length,
                votedOptionIndex: myVote?.optionIndex
              }
            : undefined
        };
      })
      .filter(Boolean);

    return {
      cursor,
      nextCursor:
        hasNextPage && pageAssets.length
          ? this.encodeFeedCursor(pageAssets[pageAssets.length - 1]!.createdAt, pageAssets[pageAssets.length - 1]!.id)
          : null,
      items
    };
  }

  async likePost(userEmail: string, assetId: string) {
    const me = await this.ensureUser(userEmail);
    await this.ensureVisibleAsset(assetId);

    await this.prisma.feedLike.upsert({
      where: { assetId_userId: { assetId, userId: me.id } },
      create: { assetId, userId: me.id },
      update: {}
    });

    const count = await this.prisma.feedLike.count({ where: { assetId } });
    return { liked: true, likeCount: count };
  }

  async unlikePost(userEmail: string, assetId: string) {
    const me = await this.ensureUser(userEmail);
    await this.prisma.feedLike.deleteMany({
      where: { assetId, userId: me.id }
    });
    const count = await this.prisma.feedLike.count({ where: { assetId } });
    return { liked: false, likeCount: count };
  }

  async comments(userEmail: string, assetId: string) {
    await this.ensureUser(userEmail);
    await this.ensureVisibleAsset(assetId);

    const comments = await this.prisma.feedComment.findMany({
      where: { assetId, parentCommentId: null },
      include: {
        user: true,
        replies: {
          include: { user: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return comments.map((comment: (typeof comments)[number]) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: comment.user.id,
        username: comment.user.username,
        name: comment.user.name,
        profileImage: comment.user.profileImage ?? undefined
      },
      replies: comment.replies.map((reply: (typeof comment.replies)[number]) => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
        user: {
          id: reply.user.id,
          username: reply.user.username,
          name: reply.user.name,
          profileImage: reply.user.profileImage ?? undefined
        }
      }))
    }));
  }

  async addComment(userEmail: string, assetId: string, content: string, parentCommentId?: string) {
    const me = await this.ensureUser(userEmail);
    if (!content.trim()) throw new BadRequestException('content is required');
    await this.ensureVisibleAsset(assetId);

    if (parentCommentId) {
      const parent = await this.prisma.feedComment.findFirst({
        where: { id: parentCommentId, assetId }
      });
      if (!parent) throw new NotFoundException('parent comment not found');
    }

    const comment = await this.prisma.feedComment.create({
      data: {
        assetId,
        userId: me.id,
        content: content.trim(),
        parentCommentId: parentCommentId ?? null
      },
      include: { user: true }
    });

    await this.createMentionNotifications(me.id, assetId, content);

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: comment.user.id,
        username: comment.user.username,
        name: comment.user.name,
        profileImage: comment.user.profileImage ?? undefined
      }
    };
  }

  async updatePost(userEmail: string, assetId: string, title: string, body: string) {
    const me = await this.ensureUser(userEmail);
    const existing = await this.prisma.whiskyAsset.findFirst({
      where: { id: assetId, userId: me.id }
    });
    if (!existing) throw new NotFoundException('post not found');

    const updated = await this.prisma.whiskyAsset.update({
      where: { id: assetId },
      data: {
        customProductName: title.trim() || existing.customProductName,
        caption: body.trim(),
        visibility: 'PUBLIC'
      }
    });

    await this.createMentionNotifications(me.id, assetId, `${title}\n${body}`);

    return { id: updated.id, updated: true };
  }

  async deletePost(userEmail: string, assetId: string) {
    const me = await this.ensureUser(userEmail);
    const existing = await this.prisma.whiskyAsset.findFirst({
      where: { id: assetId, userId: me.id }
    });
    if (!existing) throw new NotFoundException('post not found');

    await this.prisma.whiskyAsset.update({
      where: { id: assetId },
      data: {
        visibility: 'PRIVATE'
      }
    });

    return { deleted: true, assetId };
  }

  async upsertPoll(userEmail: string, assetId: string, question: string, options: string[]) {
    const me = await this.ensureUser(userEmail);
    const asset = await this.prisma.whiskyAsset.findFirst({ where: { id: assetId, userId: me.id } });
    if (!asset) throw new NotFoundException('post not found');

    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);
    if (!trimmedQuestion || trimmedOptions.length < 2) {
      throw new BadRequestException('poll question and at least 2 options are required');
    }

    const poll = await this.prisma.feedPoll.upsert({
      where: { assetId },
      create: {
        assetId,
        question: trimmedQuestion,
        options: trimmedOptions
      },
      update: {
        question: trimmedQuestion,
        options: trimmedOptions
      }
    });

    return { id: poll.id, assetId: poll.assetId };
  }

  async votePoll(userEmail: string, assetId: string, optionIndex: number) {
    const me = await this.ensureUser(userEmail);
    const poll = await this.prisma.feedPoll.findUnique({ where: { assetId } });
    if (!poll) throw new NotFoundException('poll not found');
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new BadRequestException('invalid optionIndex');
    }

    await this.prisma.feedPollVote.upsert({
      where: { pollId_userId: { pollId: poll.id, userId: me.id } },
      create: { pollId: poll.id, userId: me.id, optionIndex },
      update: { optionIndex }
    });

    return { voted: true };
  }

  async notifications(userEmail: string) {
    const me = await this.ensureUser(userEmail);
    const notifications = await this.prisma.notification.findMany({
      where: { userId: me.id },
      include: {
        actor: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return notifications.map((notification: (typeof notifications)[number]) => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      assetId: notification.assetId ?? undefined,
      createdAt: notification.createdAt.toISOString(),
      read: Boolean(notification.readAt),
      actor: notification.actor
        ? {
            id: notification.actor.id,
            username: notification.actor.username,
            name: notification.actor.name
          }
        : undefined
    }));
  }

  async markNotificationRead(userEmail: string, notificationId: string) {
    const me = await this.ensureUser(userEmail);
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId: me.id },
      data: { readAt: new Date() }
    });
    return { ok: true };
  }

  async publicProfile(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) {
      return {
        username,
        summary: { assetCount: 0, publicAssets: 0, followerCount: 0, followingCount: 0 },
        assets: []
      };
    }

    const [assets, followerCount, followingCount] = await Promise.all([
      this.prisma.whiskyAsset.findMany({
        where: { userId: user.id, visibility: 'PUBLIC' },
        include: {
          variant: {
            include: { product: { include: { brand: true } }, priceAggregate: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } })
    ]);

    return {
      username: user.username,
      name: user.name,
      profileImage: user.profileImage ?? null,
      joinedAt: user.createdAt.toISOString(),
      summary: { assetCount: assets.length, publicAssets: assets.length, followerCount, followingCount },
      assets: assets.map((asset: (typeof assets)[number]) => ({
        assetId: asset.id,
        title:
          asset.customProductName ??
          [asset.variant?.product.brand.name, asset.variant?.product.name, asset.variant?.specialTag].filter(Boolean).join(' '),
        imageUrl: asset.photoUrl,
        caption: asset.caption ?? undefined,
        productLine: asset.variant?.product?.name ?? undefined,
        hasBox: asset.boxAvailable,
        purchasePrice: Number(asset.purchasePrice),
        currentValue: asset.variant?.priceAggregate?.trustedPrice
          ? Number(asset.variant.priceAggregate.trustedPrice)
          : Number(asset.purchasePrice),
        visibility: asset.visibility,
        trustedPrice: asset.variant?.priceAggregate?.trustedPrice ? Number(asset.variant.priceAggregate.trustedPrice) : null
      }))
    };
  }

  async publicFollowers(username: string, cursor?: string, limit = 20) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return { items: [], nextCursor: null };

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const cursorFilter = this.buildFollowCursorFilter(cursor);
    const follows = await this.prisma.follow.findMany({
      where: {
        followingId: user.id,
        ...(cursorFilter ?? {})
      },
      include: {
        follower: { select: { id: true, username: true, name: true, profileImage: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1
    });

    const hasNextPage = follows.length > safeLimit;
    const page = hasNextPage ? follows.slice(0, safeLimit) : follows;

    return {
      items: page.map((row: (typeof page)[number]) => ({
        id: row.follower.id,
        username: row.follower.username,
        name: row.follower.name,
        profileImage: row.follower.profileImage ?? null,
        followedAt: row.createdAt.toISOString()
      })),
      nextCursor: hasNextPage ? this.encodeFollowCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id) : null
    };
  }

  async publicFollowing(username: string, cursor?: string, limit = 20) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return { items: [], nextCursor: null };

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const cursorFilter = this.buildFollowCursorFilter(cursor);
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: user.id,
        ...(cursorFilter ?? {})
      },
      include: {
        following: { select: { id: true, username: true, name: true, profileImage: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1
    });

    const hasNextPage = follows.length > safeLimit;
    const page = hasNextPage ? follows.slice(0, safeLimit) : follows;

    return {
      items: page.map((row: (typeof page)[number]) => ({
        id: row.following.id,
        username: row.following.username,
        name: row.following.name,
        profileImage: row.following.profileImage ?? null,
        followedAt: row.createdAt.toISOString()
      })),
      nextCursor: hasNextPage ? this.encodeFollowCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id) : null
    };
  }

  async topCollectors(limit = 10) {
    const [assets, users] = await Promise.all([
      this.prisma.whiskyAsset.findMany({
        select: {
          userId: true,
          purchasePrice: true,
          variant: { select: { priceAggregate: { select: { trustedPrice: true } } } }
        }
      }),
      this.prisma.user.findMany({
        select: { id: true, username: true, name: true, profileImage: true }
      })
    ]);

    const userMap = new Map<string, (typeof users)[number]>(users.map((user: (typeof users)[number]) => [user.id, user]));
    const totals = new Map<string, { totalValue: number; totalPurchase: number; assetCount: number }>();

    for (const asset of assets) {
      const trusted = asset.variant?.priceAggregate?.trustedPrice ? Number(asset.variant.priceAggregate.trustedPrice) : null;
      const value = trusted ?? Number(asset.purchasePrice);
      const prev = totals.get(asset.userId) ?? { totalValue: 0, totalPurchase: 0, assetCount: 0 };
      totals.set(asset.userId, {
        totalValue: prev.totalValue + value,
        totalPurchase: prev.totalPurchase + Number(asset.purchasePrice),
        assetCount: prev.assetCount + 1
      });
    }

    return [...totals.entries()]
      .sort((a, b) => b[1].totalValue - a[1].totalValue)
      .slice(0, Math.max(1, limit))
      .map(([userId, row], index) => ({
        rank: index + 1,
        userId,
        username: userMap.get(userId)?.username ?? 'unknown',
        name: userMap.get(userId)?.name ?? 'Unknown',
        profileImage: userMap.get(userId)?.profileImage ?? null,
        totalValue: row.totalValue,
        totalPurchase: row.totalPurchase,
        gainRate: row.totalPurchase > 0 ? ((row.totalValue - row.totalPurchase) / row.totalPurchase) * 100 : 0,
        assetCount: row.assetCount
      }));
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

  private async ensureVisibleAsset(assetId: string) {
    const asset = await this.prisma.whiskyAsset.findFirst({
      where: { id: assetId, visibility: 'PUBLIC' }
    });
    if (!asset) throw new NotFoundException('feed post not found');
    return asset;
  }

  private extractMentionUsernames(text: string) {
    const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? [];
    return [...new Set(matches.map((match) => match.slice(1).toLowerCase()))];
  }

  private async createMentionNotifications(actorId: string, assetId: string, text: string) {
    const usernames = this.extractMentionUsernames(text);
    if (!usernames.length) return;

    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames, mode: 'insensitive' } }
    });

    const targets = users.filter((user: (typeof users)[number]) => user.id !== actorId);
    if (!targets.length) return;

    await this.prisma.notification.createMany({
      data: targets.map((target: (typeof targets)[number]) => ({
        userId: target.id,
        actorId,
        assetId,
        type: 'MENTION',
        message: `@${target.username} mentioned in a feed post`
      }))
    });
  }

  private encodeFeedCursor(createdAt: Date, id: string) {
    return `${createdAt.toISOString()}__${id}`;
  }

  private buildFeedCursorFilter(cursor?: string) {
    if (!cursor) return undefined;
    const [createdAtRaw, id] = cursor.split('__');
    if (!createdAtRaw || !id) return undefined;
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) return undefined;

    return {
      OR: [
        { createdAt: { lt: createdAt } },
        {
          AND: [{ createdAt }, { id: { lt: id } }]
        }
      ]
    };
  }

  private encodeFollowCursor(createdAt: Date, id: string) {
    return `${createdAt.toISOString()}__${id}`;
  }

  private buildFollowCursorFilter(cursor?: string) {
    if (!cursor) return undefined;
    const [createdAtRaw, id] = cursor.split('__');
    if (!createdAtRaw || !id) return undefined;
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) return undefined;

    return {
      OR: [
        { createdAt: { lt: createdAt } },
        {
          AND: [{ createdAt }, { id: { lt: id } }]
        }
      ]
    };
  }
}
