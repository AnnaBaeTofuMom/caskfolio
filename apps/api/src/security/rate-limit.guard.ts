import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitMeta } from './rate-limit.decorator.js';
import { RateLimitService } from './rate-limit.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ ip?: string; path?: string; route?: { path?: string } }>();

    const meta =
      this.reflector.get<RateLimitMeta>(RATE_LIMIT_KEY, context.getHandler()) ??
      this.reflector.get<RateLimitMeta>(RATE_LIMIT_KEY, context.getClass()) ??
      { max: 30, ttlMs: 60_000 };

    const ip = req.ip ?? 'unknown-ip';
    const path = req.route?.path ?? req.path ?? 'unknown-path';
    const key = `${ip}:${path}`;

    const allowed = this.rateLimitService.consume(key, meta.max, meta.ttlMs);
    if (!allowed) {
      throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
