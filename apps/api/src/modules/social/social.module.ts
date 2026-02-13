import { Module } from '@nestjs/common';
import { SocialController } from './social.controller.js';
import { ProfileController } from './profile.controller.js';

@Module({ controllers: [SocialController, ProfileController] })
export class SocialModule {}
