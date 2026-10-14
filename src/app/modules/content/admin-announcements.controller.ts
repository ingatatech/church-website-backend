import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../../../helpers/message/api.response';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
} from './announcement.constants';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcement.dto';
import { ContentService } from './content.service';

@ApiTags('Announcement management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @ApiOperation({
    summary: 'List announcements for administration',
    description:
      'Returns drafts, scheduled, published, expired, unpublished and archived announcements. Optional filters narrow by controlled category, lifecycle status, or title/description search.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ANNOUNCEMENT_CATEGORIES,
  })
  @ApiQuery({ name: 'status', required: false, enum: ANNOUNCEMENT_STATUSES })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search announcement title and description.',
  })
  @ApiOkResponse({ description: 'Announcements loaded successfully.' })
  @ApiBadRequestResponse({
    description: 'Unsupported category or status filter.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid administrator session is required.',
  })
  @ApiForbiddenResponse({
    description: 'The authenticated account cannot manage announcements.',
  })
  async list(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return ApiResponseDto.ok(
      'Announcements loaded successfully.',
      await this.content.listAnnouncements({ category, status, search }),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an announcement for editing',
    description:
      'Returns a single announcement by ID, including its current image and lifecycle state.',
  })
  @ApiOkResponse({ description: 'Announcement loaded successfully.' })
  @ApiNotFoundResponse({ description: 'Announcement was not found.' })
  @ApiUnauthorizedResponse({
    description: 'A valid administrator session is required.',
  })
  @ApiForbiddenResponse({
    description: 'The authenticated account cannot manage announcements.',
  })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Announcement loaded successfully.',
      await this.content.getAnnouncement(id),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create an announcement',
    description:
      'Creates a draft, publishes immediately, or schedules publication. The URL slug is generated from the title. Image, category, title, description and publication date are required.',
  })
  @ApiCreatedResponse({ description: 'Announcement created successfully.' })
  @ApiBadRequestResponse({
    description:
      'Announcement fields, image, or date configuration are invalid.',
  })
  @ApiConflictResponse({
    description: 'The generated announcement slug could not be created.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid administrator session is required.',
  })
  @ApiForbiddenResponse({
    description: 'The authenticated account cannot manage announcements.',
  })
  async create(@Body() input: CreateAnnouncementDto) {
    return ApiResponseDto.created(
      'Announcement created successfully.',
      await this.content.createAnnouncement(input),
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an announcement',
    description:
      'Updates announcement details. Omitted fields, including an existing image, are preserved.',
  })
  @ApiOkResponse({ description: 'Announcement updated successfully.' })
  @ApiBadRequestResponse({
    description:
      'Announcement fields, image, or date configuration are invalid.',
  })
  @ApiConflictResponse({
    description: 'The announcement slug is already in use.',
  })
  @ApiNotFoundResponse({ description: 'Announcement was not found.' })
  @ApiUnauthorizedResponse({
    description: 'A valid administrator session is required.',
  })
  @ApiForbiddenResponse({
    description: 'The authenticated account cannot manage announcements.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAnnouncementDto,
  ) {
    return ApiResponseDto.ok(
      'Announcement updated successfully.',
      await this.content.updateAnnouncement(id, input),
    );
  }

  @Post(':id/:action')
  @ApiOperation({
    summary: 'Change announcement lifecycle state',
    description:
      'Publishes now, schedules for a future publication date, unpublishes, or archives an announcement. State changes retain the record for administrators.',
  })
  @ApiParam({
    name: 'action',
    enum: ['publish', 'schedule', 'unpublish', 'archive'],
  })
  @ApiOkResponse({ description: 'Announcement state changed successfully.' })
  @ApiBadRequestResponse({
    description:
      'The requested state transition or announcement dates are invalid.',
  })
  @ApiNotFoundResponse({ description: 'Announcement was not found.' })
  @ApiUnauthorizedResponse({
    description: 'A valid administrator session is required.',
  })
  @ApiForbiddenResponse({
    description: 'The authenticated account cannot manage announcements.',
  })
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action') action: string,
  ) {
    if (!['publish', 'schedule', 'unpublish', 'archive'].includes(action)) {
      throw new BadRequestException('Unsupported announcement action.');
    }
    return ApiResponseDto.ok(
      `Announcement ${action} completed successfully.`,
      await this.content.transitionAnnouncement(
        id,
        action as 'publish' | 'schedule' | 'unpublish' | 'archive',
      ),
    );
  }
}
