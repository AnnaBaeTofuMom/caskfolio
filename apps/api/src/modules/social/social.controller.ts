import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Controller('social')
export class SocialController {
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
    return {
      cursor,
      mix: { following: 0.7, recommended: 0.3 },
      nextCursor: randomUUID(),
      items: [
        {
          assetId: 'asset-1',
          owner: { username: 'maltlover', name: 'Malt Lover' },
          title: 'Macallan Sherry Oak 18',
          caption: 'Cellar shelf update',
          trustedPrice: 368000,
          priceMethod: 'WEIGHTED_MEDIAN',
          confidence: 0.82,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }
}
