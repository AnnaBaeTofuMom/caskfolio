import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

interface OAuthProfile {
  providerSub: string;
  email: string;
  name: string;
}

@Injectable()
export class OauthService {
  buildGoogleAuthUrl(redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured');
    }
    const callback = redirectUri ?? process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/auth/login';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: cryptoRandom()
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  buildAppleAuthUrl(redirectUri?: string) {
    const clientId = process.env.APPLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('APPLE_CLIENT_ID is not configured');
    }
    const callback = redirectUri ?? process.env.APPLE_REDIRECT_URI ?? 'http://localhost:3000/auth/login';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code id_token',
      response_mode: 'fragment',
      scope: 'name email',
      nonce: cryptoRandom()
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      throw new UnauthorizedException('invalid google token');
    }

    const data = (await response.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      aud?: string;
      exp?: string;
    };

    if (!data.sub || !data.email) {
      throw new UnauthorizedException('invalid google token payload');
    }

    if (process.env.GOOGLE_CLIENT_ID && data.aud && data.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException('google token audience mismatch');
    }

    if (data.exp && Number(data.exp) * 1000 < Date.now()) {
      throw new UnauthorizedException('google token expired');
    }

    return {
      providerSub: data.sub,
      email: data.email,
      name: data.name ?? data.email.split('@')[0]
    };
  }

  verifyAppleIdToken(idToken: string): OAuthProfile {
    const payload = this.decodeJwtPayload(idToken);

    const sub = this.readString(payload, 'sub');
    const email = this.readString(payload, 'email');
    const aud = this.readString(payload, 'aud');
    const iss = this.readString(payload, 'iss');
    const exp = this.readNumber(payload, 'exp');

    if (!sub || !email || !aud || !iss || !exp) {
      throw new UnauthorizedException('invalid apple token payload');
    }

    if (iss !== 'https://appleid.apple.com') {
      throw new UnauthorizedException('invalid apple issuer');
    }

    if (process.env.APPLE_CLIENT_ID && aud !== process.env.APPLE_CLIENT_ID) {
      throw new UnauthorizedException('apple token audience mismatch');
    }

    if (exp * 1000 < Date.now()) {
      throw new UnauthorizedException('apple token expired');
    }

    const name = this.readString(payload, 'name') ?? email.split('@')[0];

    return { providerSub: sub, email, name };
  }

  private decodeJwtPayload(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new BadRequestException('invalid token format');
    }

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  }

  private readString(payload: Record<string, unknown>, key: string): string | null {
    const value = payload[key];
    return typeof value === 'string' ? value : null;
  }

  private readNumber(payload: Record<string, unknown>, key: string): number | null {
    const value = payload[key];
    return typeof value === 'number' ? value : null;
  }
}

function cryptoRandom() {
  return randomBytes(16).toString('hex');
}
