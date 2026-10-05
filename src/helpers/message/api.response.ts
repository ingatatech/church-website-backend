import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true }) success: boolean;
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Request completed successfully' }) message: string;
  @ApiProperty({ required: false }) data?: T;
  static ok<T>(message: string, data?: T) {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message,
      ...(data === undefined ? {} : { data }),
    };
  }
  static created<T>(message: string, data?: T) {
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message,
      ...(data === undefined ? {} : { data }),
    };
  }
}
