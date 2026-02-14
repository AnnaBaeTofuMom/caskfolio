import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SocialFeedService } from './social-feed.service.js';

@Controller('social')
export class SocialController {
  constructor(private readonly socialFeedService: SocialFeedService) {}

  @Post('follow/:userId')
  follow(@Param('userId') userId: string) {
    return { followed: true, userId };
  }

  @Delete('follow/:userId')
  unfollow(@Param('userId') userId: string) {
    return { followed: false, userId };
  }

  @Get('feed')
  feed(@Query('cursor') cursor?: string) {
    const following = Array.from({ length: 7 }).map((_, index) => ({ id: `f-${index + 1}` }));
    const recommended = Array.from({ length: 5 }).map((_, index) => ({ id: `r-${index + 1}` }));
    const mixed = this.socialFeedService.mix(following, recommended, 10);

    return {
      cursor,
      mix: { following: 0.7, recommended: 0.3 },
      nextCursor: randomUUID(),
      items: mixed.items.map((entry, idx) => ({
        assetId: `asset-${idx + 1}`,
        owner: { username: `${entry.source.toLowerCase()}-${idx + 1}`, name: 'Collector' },
        title: idx % 2 === 0 ? 'Macallan Sherry Oak 18' : 'Yamazaki 18',
        caption: entry.source === 'FOLLOWING' ? 'Following collection update' : 'Recommended pick',
        trustedPrice: idx % 2 === 0 ? 368000 : 1020000,
        priceMethod: 'WEIGHTED_MEDIAN',
        confidence: 0.82,
        source: entry.source,
        createdAt: new Date().toISOString()
      }))
    };
  }
}
