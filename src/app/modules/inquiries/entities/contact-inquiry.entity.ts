import { Entity } from 'typeorm';
import { InquiryRecord } from './inquiry.entity';
@Entity('contact_inquiries')
export class ContactInquiry extends InquiryRecord {}
