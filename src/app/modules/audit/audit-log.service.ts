import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  module: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          event: `${entry.module}.${entry.action}`,
          actorId: entry.userId ?? null,
          details: {
            action: entry.action,
            module: entry.module,
            ...(entry.newValues ? { newValues: entry.newValues } : {}),
            ...(entry.oldValues ? { oldValues: entry.oldValues } : {}),
          },
        }),
      );
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${(err as Error).message}`);
    }
  }
}
