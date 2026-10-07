import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchEvent } from '../events/entities/church-event.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Sermon } from '../sermons/entities/sermon.entity';
import { AdminManagementController } from './admin-management.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sermon, ChurchEvent, Ministry])],
  controllers: [AdminManagementController],
})
export class AdminManagementModule {}
