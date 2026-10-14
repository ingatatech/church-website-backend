import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentRecord } from './content.entity';
import { ContentController } from './content.controller';
import { AdminContentController } from './admin-content.controller';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { ContentService } from './content.service';
import { AdminFaqsController } from './admin-faqs.controller';
import { FaqService } from './faq.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ContentRecord]), EventEmitterModule],
  controllers: [
    ContentController,
    AdminContentController,
    AdminAnnouncementsController,
    AdminFaqsController,
  ],
  providers: [ContentService, FaqService, JwtAuthGuard, AdminRoleGuard],
})
export class ContentModule {}
