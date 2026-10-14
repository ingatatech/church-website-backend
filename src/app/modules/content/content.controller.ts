import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CONTENT_TYPES } from './content.entity';
import type { ContentType } from './content.entity';
import { CreateContentDto, UpdateContentDto } from './content.dto';
import { ContentService } from './content.service';
import { ApiResponseDto } from '../../../helpers/message/api.response';
import { FaqService } from './faq.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@ApiTags('Church content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly service: ContentService,
    private readonly faqs: FaqService,
  ) {}
  @Get(':type')
  @ApiOperation({
    summary: 'List published content',
    description:
      'Browse church pages, ministries, services, events, sermons, announcements, resources, FAQs, leaders, or testimonials.',
  })
  @ApiParam({ name: 'type', enum: CONTENT_TYPES })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter published FAQs or announcements by category.',
  })
  @ApiOkResponse({ type: ApiResponseDto })
  async list(
    @Param('type') type: ContentType,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    this.validateType(type);
    return ApiResponseDto.ok(
      'Content loaded successfully',
      type === 'faqs'
        ? await this.faqs.list({ category, search }, false)
        : type === 'announcements'
          ? await this.service.listPublicAnnouncements(
              category,
              Math.min(limit, 100),
              page,
            )
          : await this.service.list(type, page, Math.min(limit, 100)),
    );
  }
  @Get(':type/:slug')
  @ApiOperation({ summary: 'Get published content by slug' })
  @ApiOkResponse({ type: ApiResponseDto })
  async get(@Param('type') type: ContentType, @Param('slug') slug: string) {
    this.validateType(type);
    return ApiResponseDto.ok(
      'Content loaded successfully',
      await this.service.get(type, slug),
    );
  }
  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a content record',
    description: 'Requires an active administrator account.',
  })
  @ApiCreatedResponse({ type: ApiResponseDto })
  async create(@Body() dto: CreateContentDto) {
    return ApiResponseDto.created(
      'Content created successfully',
      await this.service.create(dto),
    );
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a content record',
    description: 'Requires an active administrator account.',
  })
  @ApiOkResponse({ type: ApiResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return ApiResponseDto.ok(
      'Content updated successfully',
      await this.service.update(id, dto),
    );
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a content record',
    description: 'Requires an active administrator account.',
  })
  @ApiOkResponse({ type: ApiResponseDto })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Content deleted successfully',
      await this.service.remove(id),
    );
  }
  private validateType(type: ContentType) {
    if (!(CONTENT_TYPES as readonly string[]).includes(type))
      throw new BadRequestException('Unsupported content type');
  }
}
