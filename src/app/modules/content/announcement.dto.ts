import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
} from './announcement.constants';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Special Sunday Worship Service' })
  @IsString()
  @Length(1, 180)
  title: string;

  @ApiProperty({ example: 'Join us for a special Sunday service.' })
  @IsString()
  @Length(1, 10000)
  description: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/church/image/upload/church-website/service.jpg',
  })
  @IsString()
  @MaxLength(2048)
  imageUrl: string;

  @ApiProperty({ enum: ANNOUNCEMENT_CATEGORIES, example: 'WORSHIP_SERVICES' })
  @IsIn(ANNOUNCEMENT_CATEGORIES)
  category: (typeof ANNOUNCEMENT_CATEGORIES)[number];

  @ApiProperty({ example: '2026-10-10T09:00:00.000Z' })
  @IsISO8601({ strict: true })
  publicationDate: string;

  @ApiPropertyOptional({ example: '2026-10-20T23:59:00.000Z' })
  @IsOptional()
  @IsISO8601({ strict: true })
  expiryDate?: string | null;

  @ApiProperty({ enum: ANNOUNCEMENT_STATUSES, example: 'SCHEDULED' })
  @IsIn(ANNOUNCEMENT_STATUSES)
  status: (typeof ANNOUNCEMENT_STATUSES)[number];
}

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
