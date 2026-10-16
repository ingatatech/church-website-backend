import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from './entities/ministry.entity';
import { MinistriesController } from './ministries.controller';
import { AdminMinistriesController } from './admin-ministries.controller';
import { MinistriesService } from './ministries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
@Module({
  imports: [TypeOrmModule.forFeature([Ministry])],
  controllers: [MinistriesController, AdminMinistriesController],
  providers: [MinistriesService, JwtAuthGuard, AdminRoleGuard],
})
export class MinistriesModule {}
