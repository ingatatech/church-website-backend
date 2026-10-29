import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventService } from '../../../libs/pubsub/domain-event.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';
import { ContactInquiry } from './entities/contact-inquiry.entity';
import { PrayerRequest } from './entities/prayer-request.entity';
import { VisitorInquiry } from './entities/visitor-inquiry.entity';
import { InquiryRecord } from './entities/inquiry.entity';
import {
  CreateInquiryDto,
  UpdateInquiryStatusDto,
  ReplyInquiryDto,
} from './dto/create-inquiry.dto';
import { InquiriesGateway } from './inquiries.gateway';
import { InquiriesEmailService } from './inquiries-email.service';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @InjectRepository(ContactInquiry)
    private readonly contacts: Repository<ContactInquiry>,
    @InjectRepository(VisitorInquiry)
    private readonly visitors: Repository<VisitorInquiry>,
    @InjectRepository(PrayerRequest)
    private readonly prayers: Repository<PrayerRequest>,
    private readonly pubsub: DomainEventService,
    private readonly gateway: InquiriesGateway,
    private readonly emailService: InquiriesEmailService,
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

  async list(type: string, query?: { status?: string; search?: string }) {
    const repository = this.repositoryFor(type);
    const qb = repository.createQueryBuilder('inquiry');

    if (query?.status && query.status !== 'all') {
      qb.andWhere('inquiry.status = :status', { status: query.status });
    }

    if (query?.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(inquiry.name) LIKE :term OR LOWER(inquiry.email) LIKE :term OR LOWER(COALESCE(inquiry.phone, \'\')) LIKE :term OR LOWER(inquiry.message) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('inquiry.createdAt', 'DESC').addOrderBy('inquiry.id', 'DESC');
    return qb.getMany();
  }

  async updateStatus(type: string, id: string, dto: UpdateInquiryStatusDto) {
    const repository = this.repositoryFor(type);
    const row = await repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Inquiry was not found');

    const previousStatus = row.status;
    row.status = dto.status;
    const saved = await repository.save(row);

    if (previousStatus !== saved.status) {
      try {
        this.gateway.emitStatusChanged(
          type,
          saved.id,
          saved.status,
          previousStatus,
        );
      } catch (wsErr) {
        this.logger.warn(
          `Failed to emit inquiry.status_changed WebSocket event: ${(wsErr as Error).message}`,
        );
      }

      this.emailService
        .sendStatusChangeEmail(
          saved.email,
          saved.name,
          type,
          saved.status,
          previousStatus,
        )
        .catch((mailErr) => {
          this.logger.warn(
            `Failed to send status update email to ${saved.email}: ${(mailErr as Error).message}`,
          );
        });
    }

    return saved;
  }

  async reply(type: string, id: string, dto: ReplyInquiryDto) {
    const repository = this.repositoryFor(type);
    const row = await repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Inquiry was not found');

    const previousStatus = row.status;
    row.reply = dto.reply;
    row.repliedAt = new Date();

    // Auto-advance status from 'new' to 'in_progress' when a reply is saved
    if (row.status === 'new') {
      row.status = 'in_progress';
    }

    const saved = await repository.save(row);

    // Emit real-time reply event to admin sessions
    try {
      this.gateway.emitReplyCreated(
        type,
        saved.id,
        saved.reply ?? dto.reply,
        saved.repliedAt ?? new Date(),
        saved.status,
      );
    } catch (wsErr) {
      this.logger.warn(
        `Failed to emit inquiry.reply_created WebSocket event: ${(wsErr as Error).message}`,
      );
    }

    if (previousStatus !== saved.status) {
      try {
        this.gateway.emitStatusChanged(
          type,
          saved.id,
          saved.status,
          previousStatus,
        );
      } catch (wsErr) {
        this.logger.warn(
          `Failed to emit inquiry.status_changed WebSocket event: ${(wsErr as Error).message}`,
        );
      }
    }

    // Send reply email directly to visitor
    this.emailService
      .sendReplyEmail(saved.email, saved.name, type, dto.reply, saved.message)
      .catch((mailErr) => {
        this.logger.warn(
          `Failed to send reply email to ${saved.email}: ${(mailErr as Error).message}`,
        );
      });

    // Publish internal pubsub event
    await this.pubsub.publish(DOMAIN_EVENTS.INQUIRY_RECEIVED, {
      id: saved.id,
      type,
      event: 'reply',
    });

    return { id: saved.id, status: saved.status, repliedAt: saved.repliedAt };
  }

  private async save(
    repository: Repository<InquiryRecord>,
    type: string,
    dto: CreateInquiryDto,
  ) {
    const entity = repository.create({
      ...dto,
      status: 'new',
    });
    const row = await repository.save(entity);

    // 1. Emit real-time WebSocket event to active administrators immediately
    try {
      this.gateway.emitInquiryCreated(type, row);
    } catch (wsErr) {
      this.logger.warn(
        `Failed to emit inquiry.created WebSocket event: ${(wsErr as Error).message}`,
      );
    }

    // 2. Dispatch non-blocking confirmation/acknowledgment email to visitor
    this.emailService
      .sendAcknowledgmentEmail(row.email, row.name, type, row.message, row.id)
      .catch((mailErr) => {
        this.logger.warn(
          `Failed to send visitor acknowledgment email to ${row.email}: ${(mailErr as Error).message}`,
        );
      });

    // 3. Publish internal domain event for audit/pubsub subscribers
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
