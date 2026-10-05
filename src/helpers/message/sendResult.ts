import { HttpException, HttpStatus } from '@nestjs/common';

export function sendResult(
  statusCode: number,
  message: string,
  data: any = null,
) {
  return {
    success: statusCode >= 200 && statusCode < 300,
    statusCode,
    message,
    ...(data === undefined || data === null ? {} : { data }),
  };
}

export function sendError(
  statusCode: number = HttpStatus.BAD_REQUEST,
  message: string,
  errorCode: string = 'ERROR',
): never {
  throw new HttpException(
    {
      success: false,
      statusCode,
      error: errorCode,
      message,
    },
    statusCode,
  );
}
