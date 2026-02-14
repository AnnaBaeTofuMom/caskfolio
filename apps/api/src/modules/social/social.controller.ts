import { Controller, Delete, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { SocialService } from './social.service.js';

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow/:userId')
  follow(@Headers('x-user-email') userEmail = 'demo@caskfolio.com', @Param('userId') userId: string) {
    return this.socialService.follow(userEmail, userId);
  }

  @Delete('follow/:userId')
  unfollow(@Headers('x-user-email') userEmail = 'demo@caskfolio.com', @Param('userId') userId: string) {
    return this.socialService.unfollow(userEmail, userId);
  }

  @Get('feed')
  feed(
    @Headers('x-user-email') userEmail = 'demo@caskfolio.com',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    return this.socialService.feed(userEmail, cursor, Number(limit ?? 10));
  }
}
