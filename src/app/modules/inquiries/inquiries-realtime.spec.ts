import type { Repository } from 'typeorm';
import type { ContactInquiry } from './entities/contact-inquiry.entity';
import type { VisitorInquiry } from './entities/visitor-inquiry.entity';
import type { PrayerRequest } from './entities/prayer-request.entity';
import type { DomainEventService } from '../../../libs/pubsub/domain-event.service';
import { InquiriesService } from './inquiries.service';
import { InquiriesGateway } from './inquiries.gateway';
import { InquiriesEmailService } from './inquiries-email.service';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('./inquiries.gateway', () => ({
  InquiriesGateway: class {
    emitInquiryCreated = jest.fn();
    emitStatusChanged = jest.fn();
    emitReplyCreated = jest.fn();
  },
}));

jest.mock('./inquiries-email.service', () => ({
  InquiriesEmailService: class {
    sendAcknowledgmentEmail = jest.fn().mockResolvedValue(true);
    sendReplyEmail = jest.fn().mockResolvedValue({ delivered: true });
    sendStatusChangeEmail = jest.fn().mockResolvedValue(true);
  },
}));

describe('Complete Real-Time & Reply End-to-End Verification', () => {
  let service: InquiriesService;
  let gateway: InquiriesGateway;
  let emailService: InquiriesEmailService;
  let mockContactsRepo: any;
  let mockVisitorsRepo: any;
  let mockPrayersRepo: any;
  let mockPubsub: any;

  // In-memory inquiry store for stateful simulation
  const inMemoryDb: Record<string, any> = {};

  beforeEach(() => {
    mockContactsRepo = {
      create: jest.fn((dto) => ({
        id: 'contact-' + Math.random().toString(36).substring(7),
        ...dto,
        status: 'new',
        reply: null,
        repliedAt: null,
        createdAt: new Date(),
      })),
      save: jest.fn(async (entity) => {
        inMemoryDb[entity.id] = { ...entity };
        return inMemoryDb[entity.id];
      }),
      findOneBy: jest.fn(async ({ id }) => inMemoryDb[id] || null),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () =>
          Object.values(inMemoryDb).sort(
            (a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime(),
          ),
        ),
      })),
    };

    mockVisitorsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(),
      findOneBy: jest.fn(),
    };

    mockPrayersRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(),
      findOneBy: jest.fn(),
    };

    mockPubsub = {
      publish: jest.fn().mockResolvedValue(true),
    };

    gateway = new InquiriesGateway(null as any, null as any, null as any);
    emailService = new InquiriesEmailService(null as any);

    service = new InquiriesService(
      mockContactsRepo as unknown as Repository<ContactInquiry>,
      mockVisitorsRepo as unknown as Repository<VisitorInquiry>,
      mockPrayersRepo as unknown as Repository<PrayerRequest>,
      mockPubsub as unknown as DomainEventService,
      gateway,
      emailService,
    );
  });

  it('Step 1: Visitor submits contact message -> persists as "new", emits real-time event, sends acknowledgment email', async () => {
    const submission = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+250788999888',
      message: 'Hello Pastor, I would like to learn more about the Sabbath bible study.',
    };

    const result = await service.contact(submission);

    expect(result.status).toBe('received');
    expect(result.id).toBeDefined();

    const saved = inMemoryDb[result.id];
    expect(saved).toBeDefined();
    expect(saved.name).toBe('John Doe');
    expect(saved.status).toBe('new');
    expect(saved.reply).toBeNull();

    // Verify WebSocket real-time broadcast was triggered
    expect(gateway.emitInquiryCreated).toHaveBeenCalledTimes(1);
    expect(gateway.emitInquiryCreated).toHaveBeenCalledWith(
      'contact',
      expect.objectContaining({
        id: result.id,
        name: 'John Doe',
        email: 'john.doe@example.com',
        status: 'new',
      }),
    );

    // Verify Acknowledgment email was queued for visitor
    expect(emailService.sendAcknowledgmentEmail).toHaveBeenCalledWith(
      'john.doe@example.com',
      'John Doe',
      'contact',
      submission.message,
      result.id,
    );
  });

  it('Step 2: Admin writes reply -> saves reply, auto-advances status to "in_progress", emits reply & status events, emails visitor', async () => {
    // Setup existing inquiry in database
    const inquiryId = 'inquiry-step-2';
    inMemoryDb[inquiryId] = {
      id: inquiryId,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+250788999888',
      message: 'Hello Pastor, I would like to learn more about the Sabbath bible study.',
      status: 'new',
      reply: null,
      repliedAt: null,
      createdAt: new Date(),
    };

    const replyDto = {
      reply: 'Dear John, our Sabbath bible study starts this Saturday at 9:30 AM in the fellowship hall. We look forward to meeting you!',
    };

    const replyResult = await service.reply('contact', inquiryId, replyDto);

    // Verify status was automatically promoted from 'new' to 'in_progress'
    expect(replyResult.id).toBe(inquiryId);
    expect(replyResult.status).toBe('in_progress');
    expect(replyResult.repliedAt).toBeInstanceOf(Date);

    // Verify database state
    const updated = inMemoryDb[inquiryId];
    expect(updated.reply).toBe(replyDto.reply);
    expect(updated.status).toBe('in_progress');
    expect(updated.repliedAt).toBeDefined();

    // Verify WebSocket reply event was broadcasted to connected administrators
    expect(gateway.emitReplyCreated).toHaveBeenCalledWith(
      'contact',
      inquiryId,
      replyDto.reply,
      expect.any(Date),
      'in_progress',
    );

    // Verify WebSocket status_changed event was broadcasted (since status advanced to in_progress)
    expect(gateway.emitStatusChanged).toHaveBeenCalledWith(
      'contact',
      inquiryId,
      'in_progress',
      'new',
    );

    // Verify pastoral reply email was dispatched to the visitor
    expect(emailService.sendReplyEmail).toHaveBeenCalledWith(
      'john.doe@example.com',
      'John Doe',
      'contact',
      replyDto.reply,
      updated.message,
    );
  });

  it('Step 3: Admin changes status to "resolved" -> persists, emits status_changed event, sends resolution email', async () => {
    const inquiryId = 'inquiry-step-3';
    inMemoryDb[inquiryId] = {
      id: inquiryId,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+250788999888',
      message: 'Sabbath bible study query',
      status: 'in_progress',
      reply: 'Sent reply',
      repliedAt: new Date(),
      createdAt: new Date(),
    };

    const updated = await service.updateStatus('contact', inquiryId, {
      status: 'resolved' as any,
    });

    expect(updated.status).toBe('resolved');
    expect(inMemoryDb[inquiryId].status).toBe('resolved');

    // Verify WebSocket status change was emitted
    expect(gateway.emitStatusChanged).toHaveBeenCalledWith(
      'contact',
      inquiryId,
      'resolved',
      'in_progress',
    );

    // Verify status change email was dispatched
    expect(emailService.sendStatusChangeEmail).toHaveBeenCalledWith(
      'john.doe@example.com',
      'John Doe',
      'contact',
      'resolved',
      'in_progress',
    );
  });

  it('Step 4: Deterministic inquiry listing orders newest first', async () => {
    const first = await service.contact({
      name: 'Visitor 1',
      email: 'v1@example.com',
      message: 'First message',
    });

    const second = await service.contact({
      name: 'Visitor 2',
      email: 'v2@example.com',
      message: 'Second message',
    });

    const list = await service.list('contact');
    expect(list.length).toBeGreaterThanOrEqual(2);
    // Newest is at index 0
    expect(list[0].createdAt.getTime()).toBeGreaterThanOrEqual(
      list[1].createdAt.getTime(),
    );
  });
});
