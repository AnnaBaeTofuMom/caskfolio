import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async signup(email: string, password: string, name: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('email already exists');
    }

    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    const username = `${usernameBase}${Date.now().toString().slice(-6)}`;
    const passwordHash = this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        username,
        passwordHash
      }
    });

    return this.issueTokens(user.id, user.email, user.name);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.issueTokens(user.id, user.email, user.name);
  }

  async oauthLogin(input: { provider: 'google' | 'apple'; providerSub: string; email: string; name: string }) {
    const byProvider = await this.prisma.user.findFirst({
      where: { provider: input.provider, providerSub: input.providerSub }
    });

    const user =
      byProvider ??
      (await this.prisma.user.upsert({
        where: { email: input.email },
        create: {
          email: input.email,
          name: input.name,
          username: `${input.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}${Date.now().toString().slice(-6)}`,
          provider: input.provider,
          providerSub: input.providerSub
        },
        update: {
          name: input.name,
          provider: input.provider,
          providerSub: input.providerSub
        }
      }));

    return this.issueTokens(user.id, user.email, user.name);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('invalid refresh token');
    }

    if (!this.verifyTokenHash(refreshToken, session.refreshTokenHash)) {
      throw new UnauthorizedException('invalid refresh token');
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('invalid refresh token');
    }

    return this.issueTokens(user.id, user.email, user.name);
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.authSession.updateMany({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { loggedOut: true };
  }

  async passwordResetRequest(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { accepted: true, email };
    }

    const rawToken = randomBytes(24).toString('hex');
    const token = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    return { accepted: true, email, resetToken: rawToken };
  }

  async passwordResetConfirm(rawToken: string, newPassword: string) {
    const token = createHash('sha256').update(rawToken).digest('hex');
    const reset = await this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!reset) {
      throw new BadRequestException('invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: this.hashPassword(newPassword) }
    });

    await this.prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() }
    });

    return { accepted: true };
  }

  async requestPhoneVerification(email: string, phone: string) {
    const user = await this.ensureUserByEmail(email);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = this.hashToken(code);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

    await this.prisma.phoneVerification.create({
      data: {
        userId: user.id,
        phone,
        codeHash,
        expiresAt
      }
    });

    return {
      accepted: true,
      phone,
      // Dev-mode exposure. Replace with SMS provider dispatch in production.
      code
    };
  }

  async verifyPhoneCode(email: string, phone: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('user not found');
    }

    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        userId: user.id,
        phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification || verification.codeHash !== this.hashToken(code)) {
      throw new UnauthorizedException('invalid verification code');
    }

    await this.prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() }
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { phone }
    });

    return { verified: true, phone };
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const actual = Buffer.from(hash, 'hex');
    if (candidate.length !== actual.length) return false;
    return timingSafeEqual(candidate, actual);
  }

  private async issueTokens(userId: string, email: string, name: string) {
    const sid = randomUUID();

    const token = await this.jwt.signAsync(
      { sub: userId, email, name, type: 'access' },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        expiresIn: '15m'
      }
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        expiresIn: '30d'
      }
    );

    await this.prisma.authSession.create({
      data: {
        id: sid,
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    return {
      id: userId,
      email,
      name,
      token,
      refreshToken
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<{ sub: string; sid: string; type: string }> {
    try {
      const payload = (await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret'
      })) as { sub?: string; sid?: string; type?: string };

      if (!payload?.sub || !payload?.sid || payload.type !== 'refresh') {
        throw new UnauthorizedException('invalid refresh token');
      }

      return { sub: payload.sub, sid: payload.sid, type: payload.type };
    } catch {
      throw new UnauthorizedException('invalid refresh token');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private verifyTokenHash(token: string, hash: string) {
    return this.hashToken(token) === hash;
  }

  private async ensureUserByEmail(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return existing;

    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    const username = `${usernameBase}${Date.now().toString().slice(-6)}`;

    return this.prisma.user.create({
      data: {
        email,
        name: usernameBase || 'User',
        username
      }
    });
  }
}
