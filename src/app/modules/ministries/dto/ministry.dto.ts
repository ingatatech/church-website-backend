import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { PublicationStatus } from '../../sermons/entities/sermon.entity';
export class CreateMinistryDto {
  @ApiProperty() @IsString() @Length(1, 160) name: string;
  @ApiProperty() @IsString() @Length(1, 10000) description: string;
  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @Length(1, 180)
  slug?: string;
  @ApiProperty({ maxLength: 180 })
  @IsString()
  @Length(1, 180)
  targetAudience: string;
  @ApiProperty({ maxLength: 300 })
  @IsString()
  @Length(1, 300)
  meetingSchedule: string;
  @ApiProperty({ maxLength: 250 })
  @IsString()
  @Length(1, 250)
  location: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 140)
  leader?: string;
  @ApiProperty({ description: 'URL returned by the authenticated backend media upload endpoint.' })
  @IsString()
  @Length(1, 2000)
  @IsUrl({ require_tld: false })
  imageUrl: string;
  @ApiPropertyOptional({ maxLength: 254 })
  @IsOptional()
  @IsEmail()
  @Length(1, 254)
  contactEmail?: string | null;
  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  contactPhone?: string | null;
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  ctaLabel?: string | null;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @Length(1, 500)
  ctaUrl?: string | null;
  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @Length(1, 180)
  seoTitle?: string | null;
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  seoDescription?: string | null;
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}
export class UpdateMinistryDto extends PartialType(CreateMinistryDto) {}
