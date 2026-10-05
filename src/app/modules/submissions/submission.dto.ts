import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { SUBMISSION_TYPES } from './submission.entity';
export class CreateSubmissionDto {
  @ApiProperty({ enum: SUBMISSION_TYPES }) @IsIn(SUBMISSION_TYPES) type: (typeof SUBMISSION_TYPES)[number];
  @ApiProperty({ example: 'Jane Doe' }) @IsString() @Length(1, 140) name: string;
  @ApiProperty({ example: 'jane@example.com' }) @IsEmail() @Length(3, 254) email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(7, 40) phone?: string;
  @ApiProperty({ example: 'I would like to learn more about the church.' }) @IsString() @Length(5, 5000) message: string;
}
