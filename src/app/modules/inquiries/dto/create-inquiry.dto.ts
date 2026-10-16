import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
export class CreateInquiryDto {
  @ApiProperty() @IsString() @Length(1, 140) name: string;
  @ApiProperty({ example: 'visitor@example.com' })
  @IsEmail()
  @Length(3, 254)
  email: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(7, 40)
  phone?: string;
  @ApiProperty() @IsString() @Length(5, 5000) message: string;
}
export class UpdateInquiryStatusDto {
  @ApiProperty({ enum: ['new', 'in_progress', 'resolved'] })
  @IsIn(['new', 'in_progress', 'resolved'])
  status: 'new' | 'in_progress' | 'resolved';
}
export class ReplyInquiryDto {
  @ApiProperty({ description: 'Reply message to send back to the submitter', maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  reply: string;
}
