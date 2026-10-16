import { Injectable } from '@nestjs/common';

@Injectable()
export class MemoryStoreService {
  private readonly values = new Map<
    string,
    { value: string; expiresAt?: number }
  >();

  get(key: string): Promise<string | null> {
    const item = this.values.get(key);
    if (!item) return Promise.resolve(null);
    if (item.expiresAt !== undefined && Date.now() >= item.expiresAt) {
      this.values.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(item.value);
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      ttlSeconds === undefined ? undefined : Date.now() + ttlSeconds * 1000;
    this.values.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
}
