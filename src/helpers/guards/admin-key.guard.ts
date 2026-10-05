import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_KEY;
    const provided = context
      .switchToHttp()
      .getRequest()
      .header('x-admin-api-key');
    if (!expected || !provided)
      throw new UnauthorizedException('Administrator credentials are required');
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException('Administrator credentials are invalid');
    }
    return true;
  }
}
