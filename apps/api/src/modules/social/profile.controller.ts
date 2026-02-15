import { Controller, Get, Headers, Param, Query, UnauthorizedException } from '@nestjs/common';
import { SocialService } from './social.service.js';

@Controller('u')
export class ProfileController {
  constructor(private readonly socialService: SocialService) {}

  @Get(':username')
  publicProfile(@Param('username') username: string) {
    return this.socialService.publicProfile(username);
  }

  @Get(':username/followers')
  publicFollowers(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.publicFollowers(username, cursor, Number(limit ?? 20));
  }

  @Get(':username/following')
  publicFollowing(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.publicFollowing(username, cursor, Number(limit ?? 20));
  }
}
