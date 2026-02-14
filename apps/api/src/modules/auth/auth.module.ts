import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OauthService } from './oauth.service.js';
import { SmsService } from './sms.service.js';
import { RateLimitService } from '../../security/rate-limit.service.js';
import { RateLimitGuard } from '../../security/rate-limit.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, OauthService, SmsService, RateLimitService, RateLimitGuard],
  exports: [AuthService]
})
export class AuthModule {}
