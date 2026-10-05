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
  Matches,
} from 'class-validator';
import { PublicationStatus } from '../../sermons/entities/sermon.entity';
export class CreateEventDto {
  @ApiProperty() @IsString() @Length(1, 180) name: string;
  @ApiProperty({ example: '2026-12-25' }) @IsDateString() date: string;
  @ApiProperty({ example: '10:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;
  @ApiProperty() @IsString() @Length(1, 250) location: string;
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
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
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateEventDto extends PartialType(CreateEventDto) {}
