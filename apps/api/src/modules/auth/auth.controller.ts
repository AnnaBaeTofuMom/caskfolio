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
  googleAuthCallback(@Query('code') code?: string) {
    return { provider: 'google', code: code ?? null, token: 'oauth-token-placeholder' };
  }

  @Get('apple')
  appleAuthStart() {
    return { provider: 'apple', redirect: '/auth/apple/callback' };
  }

  @Get('apple/callback')
  appleAuthCallback(@Query('code') code?: string) {
    return { provider: 'apple', code: code ?? null, token: 'oauth-token-placeholder' };
  }

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.name);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
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
