import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchEvent } from './entities/church-event.entity';
import { AdminEventsController } from './admin-events.controller';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
@Module({
  imports: [TypeOrmModule.forFeature([ChurchEvent])],
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService, JwtAuthGuard, AdminRoleGuard],
})
export class EventsModule {}
