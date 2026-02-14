import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('AuthService', () => {
  it('hashes and verifies password', () => {
    const service = new AuthService({} as never);
    const hash = service.hashPassword('secret123');

    expect(hash).not.toBe('secret123');
    expect(service.verifyPassword('secret123', hash)).toBe(true);
    expect(service.verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects login when password is invalid', async () => {
    const service = new AuthService({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'demo@caskfolio.com',
          passwordHash: 'salt:deadbeef',
          username: 'demo',
          name: 'Demo'
        })
      }
    } as never);

    await expect(service.login('demo@caskfolio.com', 'wrong')).rejects.toThrow('invalid credentials');
  });
});
