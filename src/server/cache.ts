import { createHash } from 'crypto';
import { log } from './logger.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class AIResponseCache {
  private cache: Map<string, CacheEntry<string>> = new Map();
  private defaultTTL: number;
  private maxSize: number;
  private stats = { hits: 0, misses: 0 };

  constructor(defaultTTL = 60000, maxSize = 100) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  private hashKey(prompt: string, contents: unknown[], provider: string, model?: string): string {
    const data = JSON.stringify({ prompt, contents, provider, model });
    return createHash('sha256').update(data).digest('hex').slice(0, 32);
  }

  get(prompt: string, contents: unknown[], provider: string, model?: string): string | null {
    const key = this.hashKey(prompt, contents, provider, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    log.debug('Cache hit', { key: key.slice(0, 8), hits: entry.hits });
    return entry.value;
  }

  set(prompt: string, contents: unknown[], provider: string, response: string, model?: string, ttl?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const key = this.hashKey(prompt, contents, provider, model);
    this.cache.set(key, {
      value: response,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: 0,
    });

    log.debug('Cache set', { key: key.slice(0, 8), ttl: ttl ?? this.defaultTTL });
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      log.debug('Cache evicted', { key: oldest.slice(0, 8) });
    }
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    log.info('Cache cleared');
  }

  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      log.debug('Cache pruned', { count: pruned });
    }

    return pruned;
  }
}

export const aiCache = new AIResponseCache();
