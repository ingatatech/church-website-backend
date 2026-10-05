import { Injectable } from '@nestjs/common';
@Injectable()
export class CacheService {
  private readonly values = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();
  get<T>(key: string): T | undefined {
    const item = this.values.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    return item.value as T;
  }
  set<T>(key: string, value: T, ttlMs = 60000): void {
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  delete(key: string): void {
    this.values.delete(key);
  }
}
