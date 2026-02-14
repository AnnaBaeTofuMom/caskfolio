import { Injectable } from '@nestjs/common';

type SourceType = 'FOLLOWING' | 'RECOMMENDED';

interface FeedInputItem {
  id: string;
}

interface MixedFeedItem extends FeedInputItem {
  source: SourceType;
}

interface MixedFeedResult {
  items: MixedFeedItem[];
}

@Injectable()
export class SocialFeedService {
  mix(following: FeedInputItem[], recommended: FeedInputItem[], limit = 20): MixedFeedResult {
    const normalizedLimit = Math.max(1, limit);
    const preferredFollowingCount = Math.floor(normalizedLimit * 0.7);
    const preferredRecommendedCount = normalizedLimit - preferredFollowingCount;

    const followingSlice = following.slice(0, preferredFollowingCount).map((item) => ({
      ...item,
      source: 'FOLLOWING' as const
    }));

    const recommendedSlice = recommended.slice(0, preferredRecommendedCount).map((item) => ({
      ...item,
      source: 'RECOMMENDED' as const
    }));

    const items: MixedFeedItem[] = [...followingSlice, ...recommendedSlice];
    const remaining = normalizedLimit - items.length;

    if (remaining > 0) {
      const moreFollowing = following.slice(followingSlice.length).map((item) => ({
        ...item,
        source: 'FOLLOWING' as const
      }));
      const moreRecommended = recommended.slice(recommendedSlice.length).map((item) => ({
        ...item,
        source: 'RECOMMENDED' as const
      }));

      items.push(...moreFollowing.slice(0, remaining));
      const stillRemaining = normalizedLimit - items.length;
      if (stillRemaining > 0) {
        items.push(...moreRecommended.slice(0, stillRemaining));
      }
    }

    return { items: items.slice(0, normalizedLimit) };
  }
}
