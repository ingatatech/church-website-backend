import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateMinistryDto, UpdateMinistryDto } from './dto/ministry.dto';
import { MinistriesService } from './ministries.service';

@ApiTags('Ministries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/ministries')
export class AdminMinistriesController {
  constructor(private readonly service: MinistriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all ministries for administration' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'published', 'archived'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search name, slug, and description',
  })
  @ApiOkResponse({ description: 'Ministries and total matching record count' })
  list(@Query('status') status?: string, @Query('search') search?: string) {
    return this.service.listAdmin({ status, search });
  }

  @Post()
  @ApiOperation({
    summary: 'Create a ministry',
    description:
      'Creates a ministry with a unique URL slug. Image URLs must come from the authenticated backend media upload API.',
  })
  @ApiCreatedResponse()
  create(@Body() dto: CreateMinistryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ministry details or publication status' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMinistryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ministry' })
  @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
