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
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../../../helpers/message/api.response';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import {
  CreateSermonDto,
  SermonFilterQueryDto,
  UpdateSermonDto,
} from './dto/sermon.dto';
import { SermonsService } from './sermons.service';

@ApiTags('Sermon management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/sermons')
export class AdminSermonsController {
  constructor(private readonly service: SermonsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all sermons for administration (including drafts & archived)',
  })
  @ApiOkResponse()
  async list(@Query() query?: SermonFilterQueryDto) {
    return ApiResponseDto.ok(
      'Sermons loaded successfully.',
      await this.service.listForAdministration(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get any sermon by ID for editing or preview' })
  @ApiOkResponse()
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Sermon loaded successfully.',
      await this.service.getForAdmin(id),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a sermon' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateSermonDto) {
    return ApiResponseDto.created(
      'Sermon created successfully.',
      await this.service.create(dto),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sermon' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSermonDto,
  ) {
    return ApiResponseDto.ok(
      'Sermon updated successfully.',
      await this.service.update(id, dto),
    );
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish a sermon' })
  @ApiOkResponse()
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Sermon published successfully.',
      await this.service.publish(id),
    );
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a sermon' })
  @ApiOkResponse()
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Sermon unpublished successfully.',
      await this.service.unpublish(id),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sermon' })
  @ApiOkResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Sermon deleted successfully.',
      await this.service.remove(id),
    );
  }
}
