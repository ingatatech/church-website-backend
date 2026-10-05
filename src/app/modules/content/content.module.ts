import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentRecord } from './content.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentRecord])],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
