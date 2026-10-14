import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PublicationStatus } from '../entities/sermon.entity';

export class CreateSermonDto {
  @ApiProperty({ description: 'Sermon title', example: 'Walking in Faith' })
  @IsString()
  @Length(1, 180)
  title: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;

  @ApiProperty({ description: 'Speaker name', example: 'Pastor John Doe' })
  @IsString()
  @Length(1, 140)
  speaker: string;

  @ApiPropertyOptional({ description: 'Associated speaker record ID' })
  @IsOptional()
  @IsUUID()
  speakerId?: string;

  @ApiProperty({
    example: '2026-10-05',
    description: 'Date the sermon was delivered',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Category or topic', example: 'Faith' })
  @IsString()
  @Length(1, 100)
  category: string;

  @ApiPropertyOptional({
    description: 'Scripture reference',
    example: 'Hebrews 11:1',
  })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  scripture?: string;

  @ApiPropertyOptional({
    description: 'Primary Bible book',
    example: 'Hebrews',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  bibleBook?: string;

  @ApiPropertyOptional({
    description: 'Sermon series name',
    example: 'Faith That Overcomes',
  })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  series?: string;

  @ApiPropertyOptional({
    description: 'Target ministry',
    example: 'All Church',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  ministry?: string;

  @ApiPropertyOptional({
    description: 'Service name',
    example: 'Sunday Main Worship (10:30 AM)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  service?: string;

  @ApiPropertyOptional({ description: 'Sermon overview or study notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Audio file URL' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'External video URL (YouTube, Vimeo)' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether audio can be downloaded by visitors',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @ApiPropertyOptional({
    enum: PublicationStatus,
    default: PublicationStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}

export class UpdateSermonDto extends PartialType(CreateSermonDto) {}

export class SermonFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  speaker?: string;

  @IsOptional()
  @IsUUID()
  speakerId?: string;

  @IsOptional()
  @IsString()
  bibleBook?: string;

  @IsOptional()
  @IsString()
  series?: string;

  @IsOptional()
  @IsString()
  ministry?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}
