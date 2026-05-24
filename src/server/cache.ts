import { createHash } from 'crypto';
import * as path from 'path';
import { log } from './logger.js';
import type { Database } from '../types/database';
import { createJsonFallbackDb, loadJsonData, saveJsonDataSync } from './jsonFallbackDb.js';

interface CacheEntry {
  value: string;
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

interface CacheRow {
  key: string;
  value: string;
  timestamp: number;
  ttl: number;
  hits: number;
}

let _dbPath = path.resolve(process.cwd(), '.opencode-infinite', 'cache.db');
let _db: Database | null = null;
let _useFallback = false;

let _jsonRows: CacheRow[] = [];
let _jsonPath = '';

function loadFallback(): void {
  _jsonPath = _dbPath.replace(/\.db$/, '') + '-fallback.json';
  _jsonRows = loadJsonData(_jsonPath, [] as CacheRow[]);
}

function saveFallback(): void {
  saveJsonDataSync(_jsonPath, _jsonRows);
}

function fallbackGetDb(): Database {
  if (!_jsonPath) loadFallback();
  return createJsonFallbackDb({
    dbPath: _dbPath,
    rows: _jsonRows as unknown as Record<string, unknown>[],
    saveFn: saveFallback,
  }) as unknown as Database;
}

export function setCacheDbPath(dir: string): void {
  _dbPath = path.join(dir, 'cache.db');
  _db = null;
  _jsonRows = [];
  if (_useFallback) {
    _jsonPath = _dbPath.replace(/\.db$/, '') + '-fallback.json';
    loadFallback();
  }
}

function getDb(): Database {
  if (!_db) {
    try {
      const DatabaseClass: typeof import('better-sqlite3') = require('better-sqlite3');
      const db = new DatabaseClass(_dbPath) as Database;
      db.pragma('journal_mode = WAL');
      initSchema(db);
      _db = db;
    } catch {
      _useFallback = true;
      _db = fallbackGetDb();
    }
  }
  return _db;
}

function initSchema(db: Database): void {
  if (_useFallback) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      ttl INTEGER NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cache_timestamp ON cache_entries(timestamp);
  `);
}

export class AIResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private _keys: string[] = [];
  private defaultTTL: number;
  private maxSize: number;
  private stats = { hits: 0, misses: 0 };
  private _warmed = false;
  private _pendingRequests = new Map<string, Promise<string>>();
  private _pruneInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTL = 300000, maxSize = 500) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this._pruneInterval = setInterval(() => {
      const pruned = this.prune();
      if (pruned > 0) log.debug('Background cache prune', { count: pruned });
    }, 300000);
  }

  private hashKey(prompt: string, contents: unknown[], provider: string, model?: string): string {
    return createHash('sha256')
      .update(JSON.stringify({ prompt, contents, provider, model }))
      .digest('hex')
      .slice(0, 32);
  }

  private warmFromDb(): void {
    if (this._warmed) return;
    this._warmed = true;

    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM cache_entries').all!() as CacheRow[];
      const now = Date.now();
      let loaded = 0;
      let expired = 0;

      for (const row of rows) {
        if (now - row.timestamp > row.ttl) {
          expired++;
          continue;
        }
        if (this.cache.size >= this.maxSize) break;

        this.cache.set(row.key, {
          value: row.value,
          timestamp: row.timestamp,
          ttl: row.ttl,
          hits: row.hits,
        });
        this._keys.push(row.key);
        loaded++;
      }

      if (loaded > 0 || expired > 0) {
        log.info('Cache warmed from DB', { loaded, expired, size: this.cache.size });
      }
    } catch {
      /* warm silently fails */
    }
  }

  get(prompt: string, contents: unknown[], provider: string, model?: string): string | null {
    this.warmFromDb();

    const key = this.hashKey(prompt, contents, provider, model);
    const entry = this.cache.get(key);

    if (!entry) {
      const dbEntry = this.getFromDb(key);
      if (dbEntry) {
        if (this.cache.size >= this.maxSize) {
          this.evictOldest();
        }
        this.cache.set(key, dbEntry);
        this._keys.push(key);
        dbEntry.hits++;
        this.stats.hits++;
        return dbEntry.value;
      }
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this._keys = this._keys.filter((k) => k !== key);
      this.deleteFromDb(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  set(prompt: string, contents: unknown[], provider: string, response: string, model?: string, ttl?: number): void {
    this.warmFromDb();

    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const key = this.hashKey(prompt, contents, provider, model);
    const entry: CacheEntry = {
      value: response,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: 0,
    };

    this.cache.set(key, entry);
    this._keys.push(key);
    this.saveToDb(key, entry);
  }

  coalesce(prompt: string, contents: unknown[], provider: string, model: string | undefined, factory: () => Promise<string>): Promise<string> {
    const key = this.hashKey(prompt, contents, provider, model);
    const cached = this.get(prompt, contents, provider, model);
    if (cached) return Promise.resolve(cached);

    const pending = this._pendingRequests.get(key);
    if (pending) return pending;

    const promise = factory().then((result) => {
      this._pendingRequests.delete(key);
      this.set(prompt, contents, provider, result, model);
      return result;
    }).catch((err) => {
      this._pendingRequests.delete(key);
      throw err;
    });

    this._pendingRequests.set(key, promise);
    return promise;
  }

  private getFromDb(key: string): CacheEntry | null {
    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM cache_entries WHERE key = ?').get!(key) as CacheRow | undefined;
      if (!row) return null;

      if (Date.now() - row.timestamp > row.ttl) {
        this.deleteFromDb(key);
        return null;
      }

      return {
        value: row.value,
        timestamp: row.timestamp,
        ttl: row.ttl,
        hits: row.hits,
      };
    } catch {
      return null;
    }
  }

  private saveToDb(key: string, entry: CacheEntry): void {
    try {
      const db = getDb();
      db.prepare(
        'INSERT OR REPLACE INTO cache_entries (key, value, timestamp, ttl, hits) VALUES (?, ?, ?, ?, ?)'
      ).run!(key, entry.value, entry.timestamp, entry.ttl, entry.hits);
    } catch {
      /* persist silently fails */
    }
  }

  private deleteFromDb(key: string): void {
    try {
      const db = getDb();
      db.prepare('DELETE FROM cache_entries WHERE key = ?').run!(key);
    } catch {
      /* ignore */
    }
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
      this._keys = this._keys.filter((k) => k !== oldest);
    }
  }

  clear(): void {
    this.cache.clear();
    this._keys = [];
    this._pendingRequests.clear();
    this.stats = { hits: 0, misses: 0 };

    try {
      const db = getDb();
      db.prepare('DELETE FROM cache_entries').run!();
    } catch {
      /* ignore */
    }

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
        this.deleteFromDb(key);
        pruned++;
      }
    }
    this._keys = this._keys.filter((k) => this.cache.has(k));

    try {
      const db = getDb();
      const result = db.prepare('DELETE FROM cache_entries WHERE timestamp + ttl < ?').run!(now);
      const dbPruned = (result as { changes: number }).changes;
      if (dbPruned > 0) {
        pruned += dbPruned;
      }
    } catch {
      /* ignore */
    }

    if (pruned > 0) {
      log.debug('Cache pruned', { count: pruned });
    }

    return pruned;
  }

  dispose(): void {
    if (this._pruneInterval) {
      clearInterval(this._pruneInterval);
      this._pruneInterval = null;
    }
  }
}

export const aiCache = new AIResponseCache();
