import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from './entities/ministry.entity';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';
@Module({
  imports: [TypeOrmModule.forFeature([Ministry])],
  controllers: [MinistriesController],
  providers: [MinistriesService],
})
export class MinistriesModule {}
