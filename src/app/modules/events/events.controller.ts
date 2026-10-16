import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}
  @Get()
  @ApiOperation({ summary: 'List published events' })
  @ApiOkResponse()
  list() {
    return this.service.list();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a published event by ID' })
  @ApiOkResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
}
