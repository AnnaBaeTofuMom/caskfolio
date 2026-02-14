import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('AuthService', () => {
  const jwt = {
    signAsync: vi.fn(async (payload: Record<string, unknown>) => `jwt-${payload.type}-${payload.sub}-${payload.sid ?? 'none'}`),
    verifyAsync: vi.fn(async () => ({ sub: 'u1', sid: 's1', type: 'refresh' }))
  } as never;

  it('hashes and verifies password', () => {
    const service = new AuthService({} as never, jwt);
    const hash = service.hashPassword('secret123');

    expect(hash).not.toBe('secret123');
    expect(service.verifyPassword('secret123', hash)).toBe(true);
    expect(service.verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects login when password is invalid', async () => {
    const service = new AuthService(
      {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'u1',
            email: 'demo@caskfolio.com',
            passwordHash: 'salt:deadbeef',
            username: 'demo',
            name: 'Demo'
          })
        }
      } as never,
      jwt
    );

    await expect(service.login('demo@caskfolio.com', 'wrong')).rejects.toThrow('invalid credentials');
  });

  it('creates oauth user if provider identity is new', async () => {
    const prisma: any = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'u1', email: 'oauth@caskfolio.com', name: 'OAuth User' })
      },
      authSession: {
        create: vi.fn().mockResolvedValue({ id: 's1' })
      }
    };

    const service = new AuthService(prisma, jwt);
    const result = await service.oauthLogin({
      provider: 'google',
      providerSub: 'google-sub-1',
      email: 'oauth@caskfolio.com',
      name: 'OAuth User'
    });

    expect(result.email).toBe('oauth@caskfolio.com');
    expect(result.token).toContain('jwt-access');
    expect(prisma.authSession.create).toHaveBeenCalledTimes(1);
  });

  it('refreshes token when refresh session is valid', async () => {
    const prisma: any = {
      authSession: {
        findUnique: vi.fn().mockResolvedValue({
          id: 's1',
          userId: 'u1',
          refreshTokenHash: '0f3f4f3f66f71f0ec6a3f014bb2f68f3eb0f8d6df8f2506f89ceec4f8cb10f26',
          expiresAt: new Date(Date.now() + 100000),
          revokedAt: null
        }),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({})
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'demo@caskfolio.com', name: 'Demo' })
      }
    };

    const localJwt = {
      signAsync: vi.fn(async (payload: Record<string, unknown>) => `jwt-${payload.type}-${payload.sub}-${payload.sid ?? 'none'}`),
      verifyAsync: vi.fn(async () => ({ sub: 'u1', sid: 's1', type: 'refresh' }))
    } as never;

    const service = new AuthService(prisma, localJwt);
    const token = 'refresh-token';
    const hash = (service as any).hashToken(token);
    prisma.authSession.findUnique = vi.fn().mockResolvedValue({
      id: 's1',
      userId: 'u1',
      refreshTokenHash: hash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null
    });

    const result = await service.refresh(token);
    expect(result.token).toContain('jwt-access');
    expect(prisma.authSession.update).toHaveBeenCalledTimes(1);
  });

  it('creates phone verification code for existing user', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'demo@caskfolio.com',
          name: 'Demo',
          username: 'demo'
        })
      },
      phoneVerification: {
        create: vi.fn().mockResolvedValue({ id: 'p1' })
      }
    };

    const service = new AuthService(prisma, jwt);
    const result = await service.requestPhoneVerification('demo@caskfolio.com', '+821012341234');

    expect(result.accepted).toBe(true);
    expect(result.phone).toBe('+821012341234');
    expect(result.code).toHaveLength(6);
    expect(prisma.phoneVerification.create).toHaveBeenCalledTimes(1);
  });

  it('verifies phone code and updates user phone', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'demo@caskfolio.com',
          name: 'Demo',
          username: 'demo'
        }),
        update: vi.fn().mockResolvedValue({})
      },
      phoneVerification: {
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({})
      }
    };

    const service = new AuthService(prisma, jwt);
    const hash = (service as any).hashToken('123456');
    prisma.phoneVerification.findFirst.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      phone: '+82105556666',
      codeHash: hash,
      expiresAt: new Date(Date.now() + 60_000),
      verifiedAt: null
    });

    const result = await service.verifyPhoneCode('demo@caskfolio.com', '+82105556666', '123456');

    expect(result.verified).toBe(true);
    expect(prisma.phoneVerification.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });
});
