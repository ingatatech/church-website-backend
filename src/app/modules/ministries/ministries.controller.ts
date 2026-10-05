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
import { CreateMinistryDto, UpdateMinistryDto } from './dto/ministry.dto';
import { MinistriesService } from './ministries.service';
@ApiTags('Ministries')
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly service: MinistriesService) {}
  @Get()
  @ApiOperation({ summary: 'List published ministries' })
  @ApiOkResponse()
  list() {
    return this.service.list();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a published ministry by ID' })
  @ApiOkResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a ministry (administrator)' })
  @ApiCreatedResponse()
  create(@Body() dto: CreateMinistryDto) {
    return this.service.create(dto);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a ministry (administrator)' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMinistryDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a ministry (administrator)' })
  @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
