import type { Repository } from 'typeorm';
import type { ContactInquiry } from './entities/contact-inquiry.entity';
import type { VisitorInquiry } from './entities/visitor-inquiry.entity';
import type { PrayerRequest } from './entities/prayer-request.entity';
import type { DomainEventService } from '../../../libs/pubsub/domain-event.service';
import type { InquiriesGateway } from './inquiries.gateway';
import type { InquiriesEmailService } from './inquiries-email.service';
import { InquiriesService } from './inquiries.service';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('./inquiries.gateway', () => ({
  InquiriesGateway: class {},
}));

jest.mock('./inquiries-email.service', () => ({
  InquiriesEmailService: class {},
}));

describe('InquiriesService (Real-Time & Email)', () => {
  let service: InquiriesService;
  let mockContactsRepo: any;
  let mockVisitorsRepo: any;
  let mockPrayersRepo: any;
  let mockGateway: any;
  let mockEmailService: any;
  let mockPubsub: any;

  beforeEach(() => {
    mockContactsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...entity,
        createdAt: new Date(),
      })),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockVisitorsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({
        id: '223e4567-e89b-12d3-a456-426614174001',
        ...entity,
        createdAt: new Date(),
      })),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockPrayersRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({
        id: '323e4567-e89b-12d3-a456-426614174002',
        ...entity,
        createdAt: new Date(),
      })),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockGateway = {
      emitInquiryCreated: jest.fn(),
      emitStatusChanged: jest.fn(),
      emitReplyCreated: jest.fn(),
    };

    mockEmailService = {
      sendAcknowledgmentEmail: jest.fn().mockResolvedValue(true),
      sendReplyEmail: jest.fn().mockResolvedValue(true),
      sendStatusChangeEmail: jest.fn().mockResolvedValue(true),
    };

    mockPubsub = {
      publish: jest.fn().mockResolvedValue(true),
    };

    service = new InquiriesService(
      mockContactsRepo as unknown as Repository<ContactInquiry>,
      mockVisitorsRepo as unknown as Repository<VisitorInquiry>,
      mockPrayersRepo as unknown as Repository<PrayerRequest>,
      mockPubsub as unknown as DomainEventService,
      mockGateway as unknown as InquiriesGateway,
      mockEmailService as unknown as InquiriesEmailService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('contact submission', () => {
    it('saves inquiry, emits websocket event, and dispatches acknowledgment email', async () => {
      const dto = {
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        phone: '+250788111222',
        message: 'I would like to know your Saturday service times.',
      };

      const result = await service.contact(dto);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'received',
      });
      expect(mockGateway.emitInquiryCreated).toHaveBeenCalledWith(
        'contact',
        expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: dto.name,
          email: dto.email,
        }),
      );
      expect(mockEmailService.sendAcknowledgmentEmail).toHaveBeenCalledWith(
        dto.email,
        dto.name,
        'contact',
        dto.message,
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });
  });

  describe('updateStatus', () => {
    it('updates status, emits status_changed event, and sends status update email', async () => {
      const existing = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        message: 'Service times question',
        status: 'new',
      };
      mockContactsRepo.findOneBy.mockResolvedValue({ ...existing });
      mockContactsRepo.save.mockImplementation(async (r: any) => r);

      const result = await service.updateStatus('contact', existing.id, {
        status: 'resolved' as any,
      });

      expect(result.status).toBe('resolved');
      expect(mockGateway.emitStatusChanged).toHaveBeenCalledWith(
        'contact',
        existing.id,
        'resolved',
        'new',
      );
      expect(mockEmailService.sendStatusChangeEmail).toHaveBeenCalledWith(
        existing.email,
        existing.name,
        'contact',
        'resolved',
        'new',
      );
    });
  });

  describe('reply', () => {
    it('saves reply, auto-advances new to in_progress, emits reply & status events, sends reply email', async () => {
      const existing = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        message: 'Service times question',
        status: 'new',
        reply: null,
        repliedAt: null,
      };
      mockContactsRepo.findOneBy.mockResolvedValue({ ...existing });
      mockContactsRepo.save.mockImplementation(async (r: any) => r);

      const replyText =
        'Hello Sarah, our Sabbath School starts at 9:00 AM, and Divine Service at 11:00 AM.';
      const result = await service.reply('contact', existing.id, {
        reply: replyText,
      });

      expect(result.status).toBe('in_progress');
      expect(mockGateway.emitReplyCreated).toHaveBeenCalledWith(
        'contact',
        existing.id,
        replyText,
        expect.any(Date),
        'in_progress',
      );
      expect(mockGateway.emitStatusChanged).toHaveBeenCalledWith(
        'contact',
        existing.id,
        'in_progress',
        'new',
      );
      expect(mockEmailService.sendReplyEmail).toHaveBeenCalledWith(
        existing.email,
        existing.name,
        'contact',
        replyText,
        existing.message,
      );
    });
  });
});
