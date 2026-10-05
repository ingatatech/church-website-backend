import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { PublicationStatus } from '../entities/sermon.entity';
export class CreateSermonDto {
  @ApiProperty() @IsString() @Length(1, 180) title: string;
  @ApiProperty() @IsString() @Length(1, 140) speaker: string;
  @ApiProperty({ example: '2026-10-05' }) @IsDateString() date: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 300)
  scripture?: string;
  @ApiProperty() @IsString() @Length(1, 100) category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  audioUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  videoUrl?: string;
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}
export class UpdateSermonDto extends PartialType(CreateSermonDto) {}
