import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service.js';

class SignupDto {
  email!: string;
  password!: string;
  name!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  googleAuthStart() {
    return { provider: 'google', redirect: '/auth/google/callback' };
  }

  @Get('google/callback')
  googleAuthCallback(@Query('sub') sub?: string, @Query('email') email?: string, @Query('name') name?: string) {
    return this.authService.oauthLogin({
      provider: 'google',
      providerSub: sub ?? 'google-dev-sub',
      email: email ?? 'google-user@caskfolio.com',
      name: name ?? 'Google User'
    });
  }

  @Get('apple')
  appleAuthStart() {
    return { provider: 'apple', redirect: '/auth/apple/callback' };
  }

  @Get('apple/callback')
  appleAuthCallback(@Query('sub') sub?: string, @Query('email') email?: string, @Query('name') name?: string) {
    return this.authService.oauthLogin({
      provider: 'apple',
      providerSub: sub ?? 'apple-dev-sub',
      email: email ?? 'apple-user@caskfolio.com',
      name: name ?? 'Apple User'
    });
  }

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.name);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('password-reset/request')
  passwordResetRequest(@Body() body: { email: string }) {
    return this.authService.passwordResetRequest(body.email);
  }

  @Post('password-reset/confirm')
  passwordResetConfirm(@Body() body: { token: string; newPassword: string }) {
    return this.authService.passwordResetConfirm(body.token, body.newPassword);
  }
}
