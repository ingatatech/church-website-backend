import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';
import { DomainEventService } from '../../../libs/pubsub/domain-event.service';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService implements OnModuleInit {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    private readonly pubsub: DomainEventService,
  ) {}
  async onModuleInit() {
    await this.pubsub.subscribe(
      DOMAIN_EVENTS.ADMIN_LOGGED_IN,
      async (payload) => this.record(DOMAIN_EVENTS.ADMIN_LOGGED_IN, payload),
    );
    await this.pubsub.subscribe(
      DOMAIN_EVENTS.INQUIRY_RECEIVED,
      async (payload) => this.record(DOMAIN_EVENTS.INQUIRY_RECEIVED, payload),
    );
    await this.pubsub.subscribe(DOMAIN_EVENTS.SERMON_CREATED, async (payload) =>
      this.record(DOMAIN_EVENTS.SERMON_CREATED, payload),
    );
    await this.pubsub.subscribe(DOMAIN_EVENTS.EVENT_CREATED, async (payload) =>
      this.record(DOMAIN_EVENTS.EVENT_CREATED, payload),
    );
  }
  async record(event: string, payload: Record<string, unknown>) {
    const actorId =
      typeof payload.actorId === 'string' ? payload.actorId : null;
    await this.logs.save(
      this.logs.create({ event, actorId, details: payload }),
    );
  }
  list(page = 1, limit = 50) {
    return this.logs.find({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
  }
}
