import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchEvent } from '../events/entities/church-event.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { Sermon } from '../sermons/entities/sermon.entity';
import { AdminManagementController } from './admin-management.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Sermon, ChurchEvent, Ministry])],
  controllers: [AdminManagementController],
  providers: [JwtAuthGuard, AdminRoleGuard],
})
export class AdminManagementModule {}
