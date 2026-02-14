import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { OauthService } from './oauth.service.js';
import { RateLimit } from '../../security/rate-limit.decorator.js';
import { RateLimitGuard } from '../../security/rate-limit.guard.js';

class SignupDto {
  email!: string;
  password!: string;
  name!: string;
}

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OauthService
  ) {}

  @Get('google')
  googleAuthStart() {
    return { provider: 'google', redirect: '/auth/google/callback' };
  }

  @Get('google/callback')
  @RateLimit(20, 60_000)
  async googleAuthCallback(@Query('idToken') idToken?: string) {
    if (!idToken) {
      return { error: 'idToken is required' };
    }
    const profile = await this.oauthService.verifyGoogleIdToken(idToken);
    return this.authService.oauthLogin({
      provider: 'google',
      providerSub: profile.providerSub,
      email: profile.email,
      name: profile.name
    });
  }

  @Get('apple')
  appleAuthStart() {
    return { provider: 'apple', redirect: '/auth/apple/callback' };
  }

  @Get('apple/callback')
  @RateLimit(20, 60_000)
  appleAuthCallback(@Query('idToken') idToken?: string) {
    if (!idToken) {
      return { error: 'idToken is required' };
    }
    const profile = this.oauthService.verifyAppleIdToken(idToken);
    return this.authService.oauthLogin({
      provider: 'apple',
      providerSub: profile.providerSub,
      email: profile.email,
      name: profile.name
    });
  }

  @Post('signup')
  @RateLimit(10, 60_000)
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.name);
  }

  @Post('login')
  @RateLimit(10, 60_000)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @RateLimit(30, 60_000)
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @RateLimit(30, 60_000)
  logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('password-reset/request')
  @RateLimit(5, 60_000)
  passwordResetRequest(@Body() body: { email: string }) {
    return this.authService.passwordResetRequest(body.email);
  }

  @Post('password-reset/confirm')
  passwordResetConfirm(@Body() body: { token: string; newPassword: string }) {
    return this.authService.passwordResetConfirm(body.token, body.newPassword);
  }
}
