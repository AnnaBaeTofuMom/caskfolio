import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit_meta';

export interface RateLimitMeta {
  max: number;
  ttlMs: number;
}

export const RateLimit = (max: number, ttlMs: number) => SetMetadata(RATE_LIMIT_KEY, { max, ttlMs } as RateLimitMeta);
