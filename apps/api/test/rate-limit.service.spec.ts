import { describe, expect, it } from 'vitest';
import { RateLimitService } from '../src/security/rate-limit.service.js';

describe('RateLimitService', () => {
  it('blocks after max hits within ttl', () => {
    const service = new RateLimitService();

    expect(service.consume('ip:/auth/login', 2, 1000)).toBe(true);
    expect(service.consume('ip:/auth/login', 2, 1000)).toBe(true);
    expect(service.consume('ip:/auth/login', 2, 1000)).toBe(false);
  });
});
