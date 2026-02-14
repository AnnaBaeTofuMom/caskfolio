import { Injectable } from '@nestjs/common';

interface Counter {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, Counter>();

  consume(key: string, max: number, ttlMs: number): boolean {
    const now = Date.now();
    const current = this.counters.get(key);

    if (!current || current.expiresAt <= now) {
      this.counters.set(key, { count: 1, expiresAt: now + ttlMs });
      return true;
    }

    if (current.count >= max) {
      return false;
    }

    current.count += 1;
    this.counters.set(key, current);
    return true;
  }
}
