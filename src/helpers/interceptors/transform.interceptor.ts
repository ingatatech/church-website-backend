import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/** Wraps all successful endpoint results in one predictable envelope. */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => ({
        success: true,
        data:
          result &&
          typeof result === 'object' &&
          'success' in result &&
          'data' in result
            ? (result as { data: unknown }).data
            : result,
        ...(result && typeof result === 'object' && 'message' in result
          ? { message: (result as { message: unknown }).message }
          : {}),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
