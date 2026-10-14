import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisPubSubService } from '../../../libs/pubsub/redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';
import { ContactInquiry } from './entities/contact-inquiry.entity';
import { PrayerRequest } from './entities/prayer-request.entity';
import { VisitorInquiry } from './entities/visitor-inquiry.entity';
import { InquiryRecord } from './entities/inquiry.entity';
import {
  CreateInquiryDto,
  UpdateInquiryStatusDto,
} from './dto/create-inquiry.dto';
@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(ContactInquiry)
    private readonly contacts: Repository<ContactInquiry>,
    @InjectRepository(VisitorInquiry)
    private readonly visitors: Repository<VisitorInquiry>,
    @InjectRepository(PrayerRequest)
    private readonly prayers: Repository<PrayerRequest>,
    private readonly pubsub: RedisPubSubService,
  ) {}
  async contact(dto: CreateInquiryDto) {
    return this.save(this.contacts, 'contact', dto);
  }
  async visitor(dto: CreateInquiryDto) {
    return this.save(this.visitors, 'visitor', dto);
  }
  async prayer(dto: CreateInquiryDto) {
    return this.save(this.prayers, 'prayer', dto);
  }
  list(type: string) {
    return this.repositoryFor(type).find({ order: { createdAt: 'DESC' } });
  }
  async updateStatus(type: string, id: string, dto: UpdateInquiryStatusDto) {
    const repository = this.repositoryFor(type);
    const row = await repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Inquiry was not found');
    row.status = dto.status;
    return repository.save(row);
  }
  private async save(
    repository: Repository<InquiryRecord>,
    type: string,
    dto: CreateInquiryDto,
  ) {
    const row = await repository.save(repository.create(dto));
    // Do not publish personal message contents; downstream audit/email workers receive only an ID and type.
    await this.pubsub.publish(DOMAIN_EVENTS.INQUIRY_RECEIVED, {
      id: row.id,
      type,
    });
    return { id: row.id, status: 'received' };
  }
  private repositoryFor(type: string): Repository<InquiryRecord> {
    if (type === 'contact') return this.contacts;
    if (type === 'visitor') return this.visitors;
    if (type === 'prayer') return this.prayers;
    throw new BadRequestException(
      'Inquiry type must be contact, visitor, or prayer',
    );
  }
}
