import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<'USER' | 'ADMIN'>>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { role?: 'USER' | 'ADMIN'; email?: string } }>();
    const role = request.user?.role;
    if (role && requiredRoles.includes(role)) {
      return true;
    }

    // Optional bootstrap path for first admin in local/dev.
    const allowlist = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((it) => it.trim().toLowerCase())
      .filter(Boolean);
    if (request.user?.email && allowlist.includes(request.user.email.toLowerCase()) && requiredRoles.includes('ADMIN')) {
      return true;
    }

    throw new ForbiddenException('insufficient role');
  }
}
