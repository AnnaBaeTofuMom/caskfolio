import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      token: this.signToken(user.id, user.email),
      refreshToken: this.signToken(user.id, user.email, true)
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials');
    }

    return {
      email: user.email,
      token: this.signToken(user.id, user.email),
      refreshToken: this.signToken(user.id, user.email, true)
    };
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

  private signToken(userId: string, email: string, refresh = false) {
    const secret = refresh
      ? process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret'
      : process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const payload = `${userId}:${email}:${refresh ? 'refresh' : 'access'}:${Date.now()}`;
    return createHash('sha256').update(`${secret}:${payload}`).digest('hex');
  }
}
