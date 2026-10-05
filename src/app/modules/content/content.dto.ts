import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CONTENT_TYPES } from './content.entity';

export class CreateContentDto {
  @ApiProperty({ enum: CONTENT_TYPES, example: 'events' })
  @IsIn(CONTENT_TYPES)
  type: (typeof CONTENT_TYPES)[number];
  @ApiProperty({ example: 'Sunday Worship' })
  @IsString()
  @Length(1, 180)
  title: string;
  @ApiProperty({ example: 'sunday-worship' })
  @IsString()
  @Length(1, 200)
  slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateContentDto {
  @ApiPropertyOptional({ enum: CONTENT_TYPES })
  @IsOptional()
  @IsIn(CONTENT_TYPES)
  type?: (typeof CONTENT_TYPES)[number];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 180)
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean;
}
