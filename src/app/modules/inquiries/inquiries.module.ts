import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactInquiry } from './entities/contact-inquiry.entity';
import { PrayerRequest } from './entities/prayer-request.entity';
import { VisitorInquiry } from './entities/visitor-inquiry.entity';
import { ContentRecord } from '../content/content.entity';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiriesGateway } from './inquiries.gateway';
import { InquiriesEmailService } from './inquiries-email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContactInquiry,
      PrayerRequest,
      VisitorInquiry,
      ContentRecord,
    ]),
    UsersModule,
  ],
  controllers: [InquiriesController],
  providers: [
    InquiriesService,
    InquiriesGateway,
    InquiriesEmailService,
    JwtAuthGuard,
    AdminRoleGuard,
  ],
  exports: [InquiriesService, InquiriesGateway, InquiriesEmailService],
})
export class InquiriesModule {}
