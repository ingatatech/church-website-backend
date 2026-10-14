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
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { EventsService } from './events.service';

@ApiTags('Event management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events for administration' })
  @ApiOkResponse()
  async list() {
    return ApiResponseDto.ok(
      'Events loaded successfully.',
      await this.service.listForAdministration(),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create an event' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateEventDto) {
    return ApiResponseDto.created(
      'Event created successfully.',
      await this.service.create(dto),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event, including publication status' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return ApiResponseDto.ok(
      'Event updated successfully.',
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event' })
  @ApiOkResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Event deleted successfully.',
      await this.service.remove(id),
    );
  }
}
