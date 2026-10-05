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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSermonDto, UpdateSermonDto } from './dto/sermon.dto';
import { SermonsService } from './sermons.service';
@ApiTags('Sermons')
@Controller('sermons')
export class SermonsController {
  constructor(private readonly service: SermonsService) {}
  @Get()
  @ApiOperation({ summary: 'List published sermons' })
  @ApiOkResponse()
  list() {
    return this.service.list();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a published sermon by ID' })
  @ApiOkResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a sermon (administrator)' })
  @ApiCreatedResponse()
  create(@Body() dto: CreateSermonDto) {
    return this.service.create(dto);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sermon (administrator)' })
  @ApiOkResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSermonDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a sermon (administrator)' })
  @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
