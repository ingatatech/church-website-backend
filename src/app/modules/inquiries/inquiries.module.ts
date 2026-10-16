import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactInquiry } from './entities/contact-inquiry.entity';
import { PrayerRequest } from './entities/prayer-request.entity';
import { VisitorInquiry } from './entities/visitor-inquiry.entity';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
@Module({
  imports: [
    TypeOrmModule.forFeature([ContactInquiry, PrayerRequest, VisitorInquiry]),
  ],
  controllers: [InquiriesController],
  providers: [InquiriesService, JwtAuthGuard, AdminRoleGuard],
})
export class InquiriesModule {}
