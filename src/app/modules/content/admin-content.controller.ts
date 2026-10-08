import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CONTENT_TYPES } from './content.entity';
import type { ContentType } from './content.entity';
import { CreateContentDto, UpdateContentDto } from './content.dto';
import { ContentService } from './content.service';

@ApiTags('Admin content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Get(':type')
  list(@Param('type') type: ContentType) {
    this.validateType(type);
    return this.content.list(type, 1, 100, true);
  }

  @Post()
  create(@Body() input: CreateContentDto) {
    this.validateType(input.type);
    return this.content.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateContentDto,
  ) {
    if (input.type) this.validateType(input.type);
    return this.content.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.remove(id);
  }

  private validateType(type: string) {
    if (!(CONTENT_TYPES as readonly string[]).includes(type))
      throw new BadRequestException('Unsupported content type');
    if (type === 'announcements')
      throw new BadRequestException(
        'Use the announcement management endpoints at /admin/announcements.',
      );
  }
}
