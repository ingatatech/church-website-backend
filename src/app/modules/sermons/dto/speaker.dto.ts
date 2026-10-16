import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateSpeakerDto {
  @ApiProperty({ description: 'Full name of the speaker' })
  @IsString()
  @Length(1, 180)
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Role or title e.g. Senior Pastor, Guest Preacher',
  })
  @IsOptional()
  @IsString()
  @Length(1, 140)
  title?: string;

  @ApiPropertyOptional({ description: 'Brief biography of the speaker' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Profile photograph URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Social media links e.g. { twitter: "...", website: "..." }',
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}

export class UpdateSpeakerDto extends PartialType(CreateSpeakerDto) {}
