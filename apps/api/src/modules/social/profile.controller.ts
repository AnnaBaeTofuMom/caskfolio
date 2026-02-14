import { Controller, Get, Param } from '@nestjs/common';
import { SocialService } from './social.service.js';

@Controller('u')
export class ProfileController {
  constructor(private readonly socialService: SocialService) {}

  @Get(':username')
  publicProfile(@Param('username') username: string) {
    return this.socialService.publicProfile(username);
  }
}
