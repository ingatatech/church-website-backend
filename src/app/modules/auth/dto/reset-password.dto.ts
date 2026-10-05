import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'MyNewP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'MyNewP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
