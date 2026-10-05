import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user,
);
