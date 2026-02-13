import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

class SignupDto {
  email!: string;
  password!: string;
  name!: string;
}

@Controller('auth')
export class AuthController {
  @Get('google')
  googleAuthStart() {
    return { provider: 'google', redirect: '/auth/google/callback' };
  }

  @Get('google/callback')
  googleAuthCallback(@Query('code') code?: string) {
    return { provider: 'google', code: code ?? null, token: 'jwt-access-token' };
  }

  @Get('apple')
  appleAuthStart() {
    return { provider: 'apple', redirect: '/auth/apple/callback' };
  }

  @Get('apple/callback')
  appleAuthCallback(@Query('code') code?: string) {
    return { provider: 'apple', code: code ?? null, token: 'jwt-access-token' };
  }

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return {
      id: randomUUID(),
      email: body.email,
      name: body.name,
      token: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token'
    };
  }

  @Post('login')
  login(@Body() body: { email: string }) {
    return { email: body.email, token: 'jwt-access-token', refreshToken: 'jwt-refresh-token' };
  }

  @Post('password-reset/request')
  passwordResetRequest(@Body() body: { email: string }) {
    return { accepted: true, email: body.email };
  }

  @Post('password-reset/confirm')
  passwordResetConfirm(@Body() body: { token: string }) {
    return { accepted: true, token: body.token };
  }
}
