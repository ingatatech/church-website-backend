import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { mergeMap, type Observable } from 'rxjs';
import { AuditLogService } from './audit-log.service';

type AdminRequest = Request & {
  user?: { id?: string; role?: string };
};

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const method = request.method.toUpperCase();
    const actorId = request.user?.id;

    if (
      !actorId ||
      request.user?.role !== 'admin' ||
      ['GET', 'HEAD', 'OPTIONS'].includes(method) ||
      request.originalUrl.split('?')[0].startsWith('/api/auth/')
    ) {
      return next.handle();
    }

    const routeValue = request.route?.path;
    const route = typeof routeValue === 'string' ? routeValue : request.path;
    const requestPath = (request.originalUrl ?? request.url).split('?')[0];
    const pathParts = requestPath.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const moduleName = (pathParts[0] === 'admin' || pathParts[0] === 'inquiries'
      ? pathParts.slice(0, 2)
      : pathParts.slice(0, 1)
    ).join('.').slice(0, 50) || 'admin';
    const actionValue = request.params?.action;
    const action = this.actionFor(
      method,
      route,
      Array.isArray(actionValue) ? actionValue[0] : actionValue,
    );

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        await this.audit.log({
          userId: actorId,
          action,
          module: moduleName,
          newValues: {
            resourceId: this.resourceId(response) ?? request.params?.id ?? null,
            route: route.slice(0, 160),
            method,
          },
        });
        return response;
      }),
    );
  }

  private actionFor(method: string, route: string, actionParam?: string) {
    const lastSegment = (actionParam ?? route.split('/').filter(Boolean).at(-1))?.toLowerCase();
    if (lastSegment === 'publish') return 'PUBLISH';
    if (lastSegment === 'unpublish') return 'UNPUBLISH';
    if (lastSegment === 'archive') return 'ARCHIVE';
    if (lastSegment === 'status') return 'UPDATE_STATUS';
    if (lastSegment === 'reply') return 'REPLY';
    if (lastSegment === 'upload') return 'UPLOAD';
    if (method === 'DELETE') return 'DELETE';
    if (method === 'POST') return 'CREATE';
    return 'UPDATE';
  }

  private resourceId(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;
    const value = response as { id?: unknown; data?: { id?: unknown } };
    const id = value.data?.id ?? value.id;
    return typeof id === 'string' ? id : null;
  }
}
