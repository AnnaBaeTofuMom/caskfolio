import { Module } from '@nestjs/common';
import { SocialController } from './social.controller.js';
import { ProfileController } from './profile.controller.js';
import { SocialFeedService } from './social-feed.service.js';

@Module({ controllers: [SocialController, ProfileController], providers: [SocialFeedService] })
export class SocialModule {}
