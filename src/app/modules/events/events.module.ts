import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchEvent } from './entities/church-event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
@Module({
  imports: [TypeOrmModule.forFeature([ChurchEvent])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
