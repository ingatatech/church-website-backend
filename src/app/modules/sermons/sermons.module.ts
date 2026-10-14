import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSermonsController } from './admin-sermons.controller';
import { AdminSpeakersController } from './admin-speakers.controller';
import { Sermon } from './entities/sermon.entity';
import { Speaker } from './entities/speaker.entity';
import { SermonsController } from './sermons.controller';
import { SermonsService } from './sermons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Sermon, Speaker])],
  controllers: [
    SermonsController,
    AdminSermonsController,
    AdminSpeakersController,
  ],
  providers: [SermonsService, JwtAuthGuard, AdminRoleGuard],
  exports: [SermonsService],
})
export class SermonsModule {}
