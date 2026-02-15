import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { SocialService } from './social.service.js';

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow/:userId')
  follow(@Headers('x-user-email') userEmail: string | undefined, @Param('userId') userId: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.follow(userEmail, userId);
  }

  @Delete('follow/:userId')
  unfollow(@Headers('x-user-email') userEmail: string | undefined, @Param('userId') userId: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.unfollow(userEmail, userId);
  }

  @Get('feed')
  feed(
    @Headers('x-user-email') userEmail: string | undefined,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    return this.socialService.feed(userEmail, cursor, Number(limit ?? 20));
  }

  @Post('feed')
  createFeedPost(
    @Headers('x-user-email') userEmail: string | undefined,
    @Body()
    body: {
      title?: string;
      body?: string;
      linkedAssetId?: string;
      variantId?: string;
      photoUrl?: string;
      photoUrls?: string[];
      visibility?: 'PUBLIC' | 'PRIVATE';
    }
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.createFeedPost(userEmail, {
      title: body.title ?? '',
      body: body.body ?? '',
      linkedAssetId: body.linkedAssetId,
      variantId: body.variantId,
      photoUrl: body.photoUrl,
      photoUrls: body.photoUrls,
      visibility: body.visibility
    });
  }

  @Get('me/posts')
  myPosts(@Headers('x-user-email') userEmail: string | undefined) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.myPosts(userEmail);
  }

  @Get('top-collectors')
  topCollectors(@Query('limit') limit?: string) {
    return this.socialService.topCollectors(Number(limit ?? 10));
  }

  @Post('feed/:assetId/like')
  likePost(@Headers('x-user-email') userEmail: string | undefined, @Param('assetId') assetId: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.likePost(userEmail, assetId);
  }

  @Delete('feed/:assetId/like')
  unlikePost(@Headers('x-user-email') userEmail: string | undefined, @Param('assetId') assetId: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.unlikePost(userEmail, assetId);
  }

  @Get('feed/:assetId/comments')
  comments(@Headers('x-user-email') userEmail: string | undefined, @Param('assetId') assetId: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.comments(userEmail, assetId);
  }

  @Post('feed/:assetId/comments')
  addComment(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('assetId') assetId: string,
    @Body() body: { content?: string; parentCommentId?: string }
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.addComment(userEmail, assetId, body.content ?? '', body.parentCommentId);
  }

  @Patch('feed/:assetId/post')
  updatePost(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('assetId') assetId: string,
    @Body() body: { title?: string; body?: string }
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.updatePost(userEmail, assetId, body.title ?? '', body.body ?? '');
  }

  @Delete('feed/:assetId/post')
  deletePost(@Headers('x-user-email') userEmail: string | undefined, @Param('assetId') assetId: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.deletePost(userEmail, assetId);
  }

  @Post('feed/:assetId/poll')
  upsertPoll(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('assetId') assetId: string,
    @Body() body: { question?: string; options?: string[] }
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.upsertPoll(userEmail, assetId, body.question ?? '', body.options ?? []);
  }

  @Post('feed/:assetId/poll/vote')
  votePoll(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('assetId') assetId: string,
    @Body() body: { optionIndex?: number }
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.votePoll(userEmail, assetId, Number(body.optionIndex ?? -1));
  }

  @Get('notifications')
  notifications(@Headers('x-user-email') userEmail: string | undefined) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.notifications(userEmail);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@Headers('x-user-email') userEmail: string | undefined, @Param('id') id: string) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.socialService.markNotificationRead(userEmail, id);
  }
}
