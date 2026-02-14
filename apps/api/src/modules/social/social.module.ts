import { Module } from '@nestjs/common';
import { SocialController } from './social.controller.js';
import { ProfileController } from './profile.controller.js';
import { SocialFeedService } from './social-feed.service.js';
import { SocialService } from './social.service.js';

@Module({
  controllers: [SocialController, ProfileController],
  providers: [SocialFeedService, SocialService]
})
export class SocialModule {}
