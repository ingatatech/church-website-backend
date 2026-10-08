import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { ChurchEvent } from '../events/entities/church-event.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Sermon } from '../sermons/entities/sermon.entity';

@ApiTags('Admin management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminManagementController {
  constructor(
    @InjectRepository(Sermon)
    private readonly sermons: Repository<Sermon>,
    @InjectRepository(ChurchEvent)
    private readonly events: Repository<ChurchEvent>,
    @InjectRepository(Ministry)
    private readonly ministries: Repository<Ministry>,
  ) {}

  @Get('sermons')
  listSermons() {
    return this.sermons.find({ order: { date: 'DESC' } });
  }

  @Get('events')
  listEvents() {
    return this.events.find({ order: { date: 'ASC', time: 'ASC' } });
  }

  @Get('ministries')
  listMinistries() {
    return this.ministries.find({ order: { name: 'ASC' } });
  }
}
