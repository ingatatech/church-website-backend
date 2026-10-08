import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentRecord } from './content.entity';
import { ContentController } from './content.controller';
import { AdminContentController } from './admin-content.controller';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { ContentService } from './content.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentRecord])],
  controllers: [
    ContentController,
    AdminContentController,
    AdminAnnouncementsController,
  ],
  providers: [ContentService],
})
export class ContentModule {}
