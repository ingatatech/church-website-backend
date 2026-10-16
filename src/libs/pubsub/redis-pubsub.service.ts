import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainEvent } from '../../utils/constants/events';

/**
 * Pub/sub transport for domain events.
 *
 * When Upstash REST credentials are present the service runs in
 * **in-process mode** — handlers are called directly in the same
 * process without a broker. This is sufficient for a single-instance
 * deployment and avoids the TCP pub/sub limitation of the Upstash
 * REST API.
 *
 * When a plain Redis TCP server is reachable (legacy / self-hosted),
 * it uses ioredis publish/subscribe so that workers in separate
 * processes can receive events. Falls back to in-process if TCP is
 * unavailable.
 */
@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private publisher: import('ioredis').Redis | null = null;
  private subscriber: import('ioredis').Redis | null = null;
  private readonly handlers = new Map<
    string,
    Array<(payload: Record<string, unknown>) => Promise<void>>
  >();

  /** True when running in in-process mode (no TCP broker). */
  private inProcess = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const hasUpstash = Boolean(
      this.config.get('UPSTASH_REDIS_REST_URL') &&
        this.config.get('UPSTASH_REDIS_REST_TOKEN'),
    );

    if (hasUpstash) {
      this.inProcess = true;
      this.logger.log(
        'RedisPubSubService: running in in-process mode (Upstash REST does not support pub/sub)',
      );
      return;
    }

    // Attempt ioredis TCP connection
    const { Redis } = await import('ioredis');
    const options = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      connectTimeout: 1500,
      commandTimeout: 1500,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    };

    const publisher = new Redis(options);
    const subscriber = new Redis(options);
    this.publisher = publisher;
    this.subscriber = subscriber;

    for (const client of [publisher, subscriber])
      client.on('error', (error) =>
        this.logger.warn(`Redis connection unavailable: ${error.message}`),
      );

    subscriber.on('ready', () => {
      const events = Array.from(this.handlers.keys());
      if (events.length)
        void subscriber
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
        Promise.all([publisher.connect(), subscriber.connect()]),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Redis connection timed out')),
            1500,
          );
        }),
      ]);
    } catch (error) {
      this.logger.warn(
        `Redis pub/sub unavailable — falling back to in-process: ${(error as Error).message}`,
      );
      this.publisher = null;
      this.subscriber = null;
      this.inProcess = true;
      return;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    subscriber.on('message', (channel, raw) => {
      void this.dispatch(channel, raw);
    });

    const registeredEvents = Array.from(this.handlers.keys());
    if (registeredEvents.length > 0)
      await subscriber.subscribe(...registeredEvents);

    this.logger.log('RedisPubSubService: connected via TCP');
  }

  async publish(
    event: DomainEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // In-process: call handlers directly
    if (this.inProcess) {
      const handlers = this.handlers.get(event) ?? [];
      for (const handler of handlers) {
        try {
          await handler(payload);
        } catch (error) {
          this.logger.error(
            `In-process handler error for ${event}: ${(error as Error).message}`,
          );
        }
      }
      return;
    }

    if (!this.publisher || this.publisher.status !== 'ready') {
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

    if (!this.inProcess && this.subscriber?.status === 'ready')
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
    await Promise.allSettled([
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]);
  }
}
