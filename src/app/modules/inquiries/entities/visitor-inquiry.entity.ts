import { Entity } from 'typeorm';
import { InquiryRecord } from './inquiry.entity';
@Entity('visitor_inquiries')
export class VisitorInquiry extends InquiryRecord {}
