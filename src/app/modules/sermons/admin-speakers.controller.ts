import {
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
import { CreateSpeakerDto, UpdateSpeakerDto } from './dto/speaker.dto';
import { SermonsService } from './sermons.service';

@ApiTags('Speaker management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/speakers')
export class AdminSpeakersController {
  constructor(private readonly service: SermonsService) {}

  @Get()
  @ApiOperation({ summary: 'List all speakers for administration' })
  @ApiOkResponse()
  async list() {
    return ApiResponseDto.ok(
      'Speakers loaded successfully.',
      await this.service.listSpeakers(),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a speaker profile' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateSpeakerDto) {
    return ApiResponseDto.created(
      'Speaker created successfully.',
      await this.service.createSpeaker(dto),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a speaker profile' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpeakerDto,
  ) {
    return ApiResponseDto.ok(
      'Speaker updated successfully.',
      await this.service.updateSpeaker(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a speaker' })
  @ApiOkResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Speaker deleted successfully.',
      await this.service.removeSpeaker(id),
    );
  }
}
