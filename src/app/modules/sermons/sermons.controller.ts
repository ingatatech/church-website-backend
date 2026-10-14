import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import {
  CreateSermonDto,
  SermonFilterQueryDto,
  UpdateSermonDto,
} from './dto/sermon.dto';
import { SermonsService } from './sermons.service';

@ApiTags('Sermons')
@Controller('sermons')
export class SermonsController {
  constructor(private readonly service: SermonsService) {}

  @Get()
  @ApiOperation({ summary: 'List published sermons with optional filters' })
  @ApiOkResponse()
  async list(@Query() query?: SermonFilterQueryDto) {
    return this.service.listPublished(query);
  }

  @Get('filters/meta')
  @ApiOperation({
    summary: 'Get available filter metadata for published sermons',
  })
  @ApiOkResponse()
  async getFilterMeta() {
    return this.service.getFiltersMeta();
  }

  @Get('speakers')
  @ApiOperation({ summary: 'List all speakers' })
  @ApiOkResponse()
  async listSpeakers() {
    return this.service.listSpeakers();
  }

  @Get('speakers/:idOrSlug')
  @ApiOperation({
    summary: 'Get a speaker profile and their published sermons',
  })
  @ApiOkResponse()
  async getSpeaker(@Param('idOrSlug') idOrSlug: string) {
    return this.service.getSpeaker(idOrSlug);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get a published sermon by slug with related messages',
  })
  @ApiOkResponse()
  async getBySlug(@Param('slug') slug: string) {
    return this.service.getPublishedBySlugOrId(slug);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a published sermon by ID or slug' })
  @ApiOkResponse()
  async get(@Param('idOrSlug') idOrSlug: string) {
    return this.service.getPublishedBySlugOrId(idOrSlug);
  }

  // ==========================================
  // BACKWARD-COMPATIBLE ADMIN ENDPOINTS
  // ==========================================

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a sermon (administrator)' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateSermonDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sermon (administrator)' })
  @ApiOkResponse()
  async update(@Param('id') id: string, @Body() dto: UpdateSermonDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a sermon (administrator)' })
  @ApiOkResponse()
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
