import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
  type?: string;
  exp?: number;
};

@Injectable()
export class JwtAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: JwtPayload }>();
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    const payload = this.verifyAccessToken(token);
    request.user = payload;
    return true;
  }

  private verifyAccessToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('invalid access token');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const secret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const expectedSignature = this.base64Url(
      createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest()
    );

    const provided = Buffer.from(encodedSignature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('invalid access token signature');
    }

    const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as JwtPayload;
    if (!payload?.sub || payload.type !== 'access') {
      throw new UnauthorizedException('invalid access token payload');
    }
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('access token expired');
    }
    return payload;
  }

  private base64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(input: string): string {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
    return Buffer.from(normalized, 'base64').toString('utf8');
  }
}
