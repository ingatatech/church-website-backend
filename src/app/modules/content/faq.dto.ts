import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { FAQ_CATEGORIES, FAQ_STATUSES } from './faq.constants';

export class CreateFaqDto {
  @ApiProperty() @IsString() @Length(1, 180) question: string;
  @ApiProperty({ maxLength: 10000 })
  @IsString()
  @Length(1, 10000)
  answer: string;
  @ApiPropertyOptional({ enum: FAQ_CATEGORIES })
  @IsOptional()
  @IsIn(FAQ_CATEGORIES)
  category?: (typeof FAQ_CATEGORIES)[number] | null;
  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;
  @ApiPropertyOptional({ enum: FAQ_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(FAQ_STATUSES)
  status?: (typeof FAQ_STATUSES)[number];
}
export class UpdateFaqDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 180)
  question?: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  answer?: string;
  @ApiPropertyOptional({ enum: FAQ_CATEGORIES })
  @IsOptional()
  @IsIn(FAQ_CATEGORIES)
  category?: (typeof FAQ_CATEGORIES)[number] | null;
  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  displayOrder?: number;
  @ApiPropertyOptional({ enum: FAQ_STATUSES })
  @IsOptional()
  @IsIn(FAQ_STATUSES)
  status?: (typeof FAQ_STATUSES)[number];
}
export class ReorderFaqsDto {
  @ApiProperty({
    type: [String],
    description: 'Every FAQ ID in the desired order.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids: string[];
}
export class FaqStatusDto {
  @ApiProperty({ enum: FAQ_STATUSES })
  @IsIn(FAQ_STATUSES)
  status: (typeof FAQ_STATUSES)[number];
}
