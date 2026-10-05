import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DomainEvent } from '../../utils/constants/events';

/** Redis-backed pub/sub transport shared by producers and domain subscribers. */
@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private readonly handlers = new Map<
    string,
    Array<(payload: Record<string, unknown>) => Promise<void>>
  >();
  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const options = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    };
    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);
    for (const client of [this.publisher, this.subscriber])
      client.on('error', (error) =>
        this.logger.warn(`Redis connection unavailable: ${error.message}`),
      );
    this.subscriber.on('ready', () => {
      const events = Array.from(this.handlers.keys());
      if (events.length)
        void this.subscriber
          .subscribe(...events)
          .catch((error) =>
            this.logger.warn(
              `Unable to restore Redis subscriptions: ${error.message}`,
            ),
          );
    });
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        Promise.all([this.publisher.connect(), this.subscriber.connect()]),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Redis connection timed out')),
            1500,
          );
        }),
      ]);
    } catch (error) {
      this.logger.warn(
        `Redis pub/sub is disabled until Redis is reachable: ${(error as Error).message}`,
      );
      return;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    this.subscriber.on('message', (channel, raw) => {
      void this.dispatch(channel, raw);
    });
    const registeredEvents = Array.from(this.handlers.keys());
    if (registeredEvents.length > 0)
      await this.subscriber.subscribe(...registeredEvents);
    this.logger.log('Redis pub/sub connected');
  }

  async publish(
    event: DomainEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.publisher?.status || this.publisher.status !== 'ready') {
      this.logger.warn(`Skipped ${event}; Redis is unavailable`);
      return;
    }
    await this.publisher.publish(event, JSON.stringify(payload));
  }

  async subscribe(
    event: DomainEvent,
    handler: (payload: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    const listeners = this.handlers.get(event) ?? [];
    listeners.push(handler);
    this.handlers.set(event, listeners);
    if (this.subscriber?.status === 'ready')
      await this.subscriber.subscribe(event);
  }

  private async dispatch(event: string, raw: string) {
    try {
      const payload = JSON.parse(raw) as Record<string, unknown>;
      for (const handler of this.handlers.get(event) ?? [])
        await handler(payload);
    } catch (error) {
      this.logger.error(
        `Unable to process Redis event ${event}: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.publisher?.quit(), this.subscriber?.quit()]);
  }
}
