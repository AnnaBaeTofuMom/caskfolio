import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SmsService } from './sms.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService = new SmsService()
  ) {}

  async signup(email: string, password: string, name: string) {
    if (!email?.trim()) {
      throw new BadRequestException('email is required');
    }
    if (!password?.trim()) {
      throw new BadRequestException('password is required');
    }
    if (!name?.trim()) {
      throw new BadRequestException('name is required');
    }

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
        passwordHash,
        role: this.resolveSignupRole(email)
      }
    });

    return this.issueTokens(user.id, user.email, user.name, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.issueTokens(user.id, user.email, user.name, user.role);
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
          providerSub: input.providerSub,
          role: this.resolveSignupRole(input.email)
        },
        update: {
          name: input.name,
          provider: input.provider,
          providerSub: input.providerSub
        }
      }));

    return this.issueTokens(user.id, user.email, user.name, user.role);
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

    return this.issueTokens(user.id, user.email, user.name, user.role);
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
    await this.sms.sendVerificationCode(phone, code);

    const exposeCode = process.env.NODE_ENV !== 'production' || (process.env.SMS_PROVIDER ?? 'mock').toLowerCase() === 'mock';
    return {
      accepted: true,
      phone,
      ...(exposeCode ? { code } : {})
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
    // Compact format to avoid oversized values in constrained DB varchar columns.
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 32);
    return `s2$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  }

  verifyPassword(password: string, storedHash: string) {
    // New compact format.
    if (storedHash.startsWith('s2$')) {
      const [, saltB64, hashB64] = storedHash.split('$');
      if (!saltB64 || !hashB64) return false;
      const salt = Buffer.from(saltB64, 'base64url');
      const actual = Buffer.from(hashB64, 'base64url');
      const candidate = scryptSync(password, salt, actual.length);
      if (candidate.length !== actual.length) return false;
      return timingSafeEqual(candidate, actual);
    }

    // Legacy format support: "<salt hex>:<hash hex>".
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;
    const candidate = scryptSync(password, saltHex, 64);
    const actual = Buffer.from(hashHex, 'hex');
    if (candidate.length !== actual.length) return false;
    return timingSafeEqual(candidate, actual);
  }

  private async issueTokens(userId: string, email: string, name: string, role: 'USER' | 'ADMIN') {
    const sid = randomUUID();

    const token = await this.jwt.signAsync(
      { sub: userId, email, name, role, type: 'access' },
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

  private resolveSignupRole(email: string): 'USER' | 'ADMIN' {
    const allowlist = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((it) => it.trim().toLowerCase())
      .filter(Boolean);
    return allowlist.includes(email.toLowerCase()) ? 'ADMIN' : 'USER';
  }
}
