import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactInquiry } from './entities/contact-inquiry.entity';
import { PrayerRequest } from './entities/prayer-request.entity';
import { VisitorInquiry } from './entities/visitor-inquiry.entity';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([ContactInquiry, PrayerRequest, VisitorInquiry]),
  ],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
