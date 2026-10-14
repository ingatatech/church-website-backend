import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';
import { PublicationStatus } from '../../sermons/entities/sermon.entity';
export class CreateEventDto {
  @ApiProperty() @IsString() @Length(1, 180) name: string;
  @ApiProperty({ example: '2026-12-25' }) @IsDateString() date: string;
  @ApiProperty({ example: '10:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;
  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string | null;
  @ApiProperty() @IsString() @Length(1, 250) location: string;
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 180)
  organizer?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 140)
  speaker?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  flyerUrl?: string;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  registrationRequired?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  registrationInfo?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 254)
  contactInfo?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  mapUrl?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
}
export class UpdateEventDto extends PartialType(CreateEventDto) {}
