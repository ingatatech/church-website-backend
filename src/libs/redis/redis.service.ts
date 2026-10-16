import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Unified Redis key-value store.
 *
 * Priority order:
 *   1. Upstash Redis REST API  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *   2. ioredis TCP             (REDIS_HOST + REDIS_PORT)
 *   3. In-memory Map           (automatic fallback when neither is reachable)
 *
 * The Upstash path uses plain HTTPS fetch — no persistent connection needed.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  // Upstash REST
  private upstashUrl: string | null = null;
  private upstashToken: string | null = null;

  // ioredis TCP (lazy-loaded only when Upstash is not configured)
  private ioClient: import('ioredis').default | null = null;

  // In-memory fallback
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt?: number }
  >();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const restUrl = this.config.get<string>('UPSTASH_REDIS_REST_URL');
    const restToken = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (restUrl && restToken) {
      this.upstashUrl = restUrl.replace(/\/$/, '');
      this.upstashToken = restToken;
      this.logger.log('RedisService: using Upstash REST API');
      return;
    }

    // Fall back to ioredis TCP
    const { default: Redis } = await import('ioredis');
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD') || undefined;

    this.ioClient = new Redis({
      host,
      port,
      password,
      connectTimeout: 1500,
      commandTimeout: 1500,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    this.ioClient.on('error', (err) => {
      this.logger.warn(`Redis client error: ${err.message}`);
    });

    try {
      await this.ioClient.connect();
      this.logger.log('RedisService: connected via TCP');
    } catch {
      this.logger.warn(
        'Redis unavailable — using in-memory fallback for tokens/OTP',
      );
      this.ioClient = null;
    }
  }

  async get(key: string): Promise<string | null> {
    // 1. Upstash REST
    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await fetch(`${this.upstashUrl}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${this.upstashToken}` },
        });
        if (res.ok) {
          const json = (await res.json()) as { result: string | null };
          return json.result ?? null;
        }
      } catch (err) {
        this.logger.warn(`Upstash GET failed: ${(err as Error).message}`);
      }
    }

    // 2. ioredis TCP
    if (this.ioClient?.status === 'ready') {
      try {
        return await this.ioClient.get(key);
      } catch { /* fall through */ }
    }

    // 3. In-memory
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    // 1. Upstash REST
    if (this.upstashUrl && this.upstashToken) {
      try {
        const url = ttlSeconds
          ? `${this.upstashUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttlSeconds}`
          : `${this.upstashUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
        const res = await fetch(url, {
          method: 'GET', // Upstash REST uses GET for pipeline-style commands
          headers: { Authorization: `Bearer ${this.upstashToken}` },
        });
        if (res.ok) return;
      } catch (err) {
        this.logger.warn(`Upstash SET failed: ${(err as Error).message}`);
      }
    }

    // 2. ioredis TCP
    if (this.ioClient?.status === 'ready') {
      try {
        if (ttlSeconds) {
          await this.ioClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.ioClient.set(key, value);
        }
        return;
      } catch { /* fall through */ }
    }

    // 3. In-memory
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    // 1. Upstash REST
    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await fetch(`${this.upstashUrl}/del/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${this.upstashToken}` },
        });
        if (res.ok) return;
      } catch (err) {
        this.logger.warn(`Upstash DEL failed: ${(err as Error).message}`);
      }
    }

    // 2. ioredis TCP
    if (this.ioClient?.status === 'ready') {
      try {
        await this.ioClient.del(key);
        return;
      } catch { /* fall through */ }
    }

    // 3. In-memory
    this.memoryStore.delete(key);
  }

  async onModuleDestroy() {
    if (this.ioClient) {
      await this.ioClient.quit().catch(() => undefined);
    }
  }
}
