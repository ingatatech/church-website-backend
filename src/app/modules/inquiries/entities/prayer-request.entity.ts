import { Entity } from 'typeorm';
import { InquiryRecord } from './inquiry.entity';
@Entity('prayer_requests')
export class PrayerRequest extends InquiryRecord {}
