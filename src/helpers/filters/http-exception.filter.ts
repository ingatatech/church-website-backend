import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    if (!(exception instanceof HttpException)) {
      const error =
        exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `Unhandled exception for ${request.method} ${request.path}: ${error.message}`,
        error.stack,
      );
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'An unexpected error occurred';
    const responseMessage =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? payload.message
        : undefined;
    const message =
      typeof payload === 'string'
        ? payload
        : typeof responseMessage === 'string'
          ? responseMessage
          : Array.isArray(responseMessage)
            ? responseMessage.join(', ')
            : 'Request failed';
    response.status(status).json({
      success: false,
      statusCode: status,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}
