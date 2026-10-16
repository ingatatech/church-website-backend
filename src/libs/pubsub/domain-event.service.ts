import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../../utils/constants/events';

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);
  private readonly handlers = new Map<
    string,
    Array<(payload: Record<string, unknown>) => Promise<void>>
  >();

  async publish(
    event: DomainEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    for (const handler of this.handlers.get(event) ?? []) {
      try {
        await handler(payload);
      } catch (error) {
        this.logger.error(
          `In-process handler error for ${event}: ${(error as Error).message}`,
        );
      }
    }
  }

  subscribe(
    event: DomainEvent,
    handler: (payload: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    const listeners = this.handlers.get(event) ?? [];
    listeners.push(handler);
    this.handlers.set(event, listeners);
    return Promise.resolve();
  }
}
