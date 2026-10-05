import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetupPasswordDto {
  @ApiProperty({ example: 'MySecureP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'MySecureP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
