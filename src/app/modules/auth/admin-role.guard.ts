import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole, UserStatus } from '../../../utils/enums';

type AuthenticatedRequest = Request & {
  user?: { role?: UserRole; status?: UserStatus };
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      request.user?.role !== UserRole.admin ||
      request.user?.status !== UserStatus.active
    ) {
      throw new ForbiddenException('Administrator access is required');
    }
    return true;
  }
}
