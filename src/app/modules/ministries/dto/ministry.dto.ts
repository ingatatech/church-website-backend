import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { PublicationStatus } from '../../sermons/entities/sermon.entity';
export class CreateMinistryDto {
  @ApiProperty() @IsString() @Length(1, 160) name: string;
  @ApiProperty({ example: 'youth-ministry' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Length(1, 180)
  slug: string;
  @ApiProperty() @IsString() @Length(1, 10000) description: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 140)
  leader?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
  @ApiPropertyOptional({ enum: PublicationStatus })
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}
export class UpdateMinistryDto extends PartialType(CreateMinistryDto) {}
