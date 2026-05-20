import { createHash } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger.js';
import type { Database } from '../types/database';

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

let _jsonEntries: CacheRow[] = [];
let _jsonPath = '';

function loadJson(): void {
  try {
    if (fs.existsSync(_jsonPath)) {
      const raw = fs.readFileSync(_jsonPath, 'utf-8');
      _jsonEntries = JSON.parse(raw) as CacheRow[];
    }
  } catch {
    /* ignore */
  }
}

function saveJson(): void {
  try {
    fs.mkdirSync(path.dirname(_jsonPath), { recursive: true });
    fs.writeFileSync(_jsonPath, JSON.stringify(_jsonEntries, null, 2));
  } catch {
    /* ignore */
  }
}

function fallbackGetDb(): Database {
  if (!_jsonPath) {
    _jsonPath = _dbPath.replace(/\.db$/, '') + '-fallback.json';
    loadJson();
  }
  return {
    prepare: (sql: string) => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith('insert into cache_entries')) {
        return {
          run: (key: unknown, value: unknown, timestamp: unknown, ttl: unknown, hits: unknown) => {
            const idx = _jsonEntries.findIndex((e) => e.key === String(key));
            if (idx !== -1) _jsonEntries.splice(idx, 1);
            _jsonEntries.push({
              key: String(key),
              value: String(value),
              timestamp: Number(timestamp),
              ttl: Number(ttl),
              hits: Number(hits),
            });
            saveJson();
            return { lastInsertRowid: _jsonEntries.length, changes: 1 };
          },
        };
      }
      if (trimmed.startsWith('select * from cache_entries where key =')) {
        return {
          get: (key: unknown) => _jsonEntries.find((e) => e.key === String(key)),
        };
      }
      if (trimmed.startsWith('select * from cache_entries')) {
        return {
          all: () => _jsonEntries,
        };
      }
      if (trimmed.startsWith('delete from cache_entries')) {
        return {
          run: () => {
            _jsonEntries = [];
            saveJson();
            return { lastInsertRowid: 0, changes: 0 };
          },
        };
      }
      return {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => undefined,
        all: () => [],
      };
    },
    exec: () => {},
    pragma: () => {},
  };
}

export function setCacheDbPath(dir: string): void {
  _dbPath = path.join(dir, 'cache.db');
  _db = null;
  _jsonEntries = [];
  if (_useFallback) {
    _jsonPath = _dbPath.replace(/\.db$/, '') + '-fallback.json';
    loadJson();
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
  private defaultTTL: number;
  private maxSize: number;
  private stats = { hits: 0, misses: 0 };
  private _warmed = false;

  constructor(defaultTTL = 60000, maxSize = 100) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  private hashKey(prompt: string, contents: unknown[], provider: string, model?: string): string {
    const data = JSON.stringify({ prompt, contents, provider, model });
    return createHash('sha256').update(data).digest('hex').slice(0, 32);
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
        loaded++;
      }

      if (loaded > 0 || expired > 0) {
        log.info('Cache warmed from DB', { loaded, expired, size: this.cache.size });
      }
    } catch {
      /* warm silently fails — in-memory cache still works */
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
        dbEntry.hits++;
        this.stats.hits++;
        log.debug('Cache hit (from DB)', { key: key.slice(0, 8) });
        return dbEntry.value;
      }
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.deleteFromDb(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    log.debug('Cache hit', { key: key.slice(0, 8), hits: entry.hits });
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
    this.saveToDb(key, entry);

    log.debug('Cache set', { key: key.slice(0, 8), ttl: ttl ?? this.defaultTTL });
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
      if (_useFallback) saveJson();
    } catch {
      /* persist silently fails — in-memory cache still works */
    }
  }

  private deleteFromDb(key: string): void {
    try {
      const db = getDb();
      db.prepare('DELETE FROM cache_entries WHERE key = ?').run!(key);
      if (_useFallback) {
        _jsonEntries = _jsonEntries.filter((e) => e.key !== key);
        saveJson();
      }
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
      log.debug('Cache evicted', { key: oldest.slice(0, 8) });
    }
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };

    try {
      const db = getDb();
      db.prepare('DELETE FROM cache_entries').run!();
      if (_useFallback) {
        _jsonEntries = [];
        saveJson();
      }
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

    try {
      const db = getDb();
      const result = db.prepare('DELETE FROM cache_entries WHERE timestamp + ttl < ?').run!(now);
      const dbPruned = (result as { changes: number }).changes;
      if (dbPruned > 0) {
        pruned += dbPruned;
        if (_useFallback) saveJson();
      }
    } catch {
      /* ignore */
    }

    if (pruned > 0) {
      log.debug('Cache pruned', { count: pruned });
    }

    return pruned;
  }
}

export const aiCache = new AIResponseCache();
